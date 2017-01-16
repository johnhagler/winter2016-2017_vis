'use strict';

(function() {

    var margin = 75,
        width = 1200 - margin,
        height = 600 - margin;

    var fmt_date = d3.time.format('%Y%m%d');
    var colors = ['#18bc9c', '#95a5a6'];
    var seasons = ['This Winter', 'Last Winter'];

    var svg = d3.select('#chart')
        .append('svg')
        .attr('width', width)
        .attr('height', height);



    function draw(data) {




        var x_extents = d3.extent(data, function(d) {
            return d.Date
        });
        var x_scale = d3.time.scale()
            .range([margin, width - margin])
            .domain(x_extents);

        var x_axis = d3.svg.axis()
            .scale(x_scale)
            .ticks(d3.time.weeks, 1);
        svg.append('g').attr('class', 'x axis')
            .attr('transform', 'translate(0,' + (height - margin) + ')')
            .call(x_axis);


        var y_scale = d3.scale.linear()
            .range([height - margin, margin])
            .domain(minMaxExtents(data, ['Tmax', 'Tmin']));

        var y_axis = d3.svg
            .axis()
            .scale(y_scale)
            .orient('left');
        svg.append('g').attr('class', 'y axis')
            .attr('transform', 'translate(' + margin + ', 0)')
            .call(y_axis);




        var legend = svg.append('g').attr('class', 'legend')
            .attr('transform', 'translate(' + (width - 320) + ', ' + (height - 40) + ')')
            .selectAll('g')
            .data(seasons)
            .enter()
            .append('g');

        legend.append('circle')
            .attr('cx', function(d, i) {
                return 120 * i;
            })
            .attr('r', 8)
            .attr('fill', function(d, i) {
                return colors[i];
            });

        legend.append('text')
            .attr('x', function(d, i) {
                return (i * 120) + 15;
            })
            .attr('y', '6')
            .text(function(d, i) {
                return seasons[i];
            });




        svg.append('line').attr('class', 'freezing')
            .attr('x1', x_scale(x_extents[0]))
            .attr('y1', y_scale(32))
            .attr('x2', x_scale(x_extents[1]))
            .attr('y2', y_scale(32))
            .attr('stroke-width', '1');

        svg.append('text').attr('class', 'freezing')
            .attr('x', '20')
            .attr('y', y_scale(32))
            .text('Freezing');


        svg.append('text').attr('class', 'y axis')
            .attr('text-anchor', 'middle')
            .attr('transform', 'translate(40,' + (height / 2 + 40) + ')rotate(-90)')
            .text('Temperature');




        function update(location) {

            d3.selectAll('.temp-forecast-stream').remove();
            var file;
            if (location == '24243') {
                file = 'yakima_forecast.json';
            } else if (location == '94239') {
                file = 'wenatchee_forecast.json';
            }

            d3.json(file, function(data) {

                var area = d3.svg.area()
                    .interpolate('basis')
                    .x(function(d) {
                        return x_scale(new Date(d.time * 1000));
                    })
                    .y0(function(d) {
                        return y_scale(+d.temperatureMin);
                    })
                    .y1(function(d) {
                        return y_scale(+d.temperatureMax);
                    });

                var streams = svg
                    .append('path')
                    .attr('class', 'temp-forecast-stream')
                    .attr('fill', colors[0])
                    .attr('d', area(data.daily.data));



                // show bounds of forecast data
                var fcst_extents = d3.extent(data.daily.data, function(d) {
                    return new Date(d.time * 1000);
                });


                var forecast_bounds = svg.selectAll('.forecast-bound')
                    .data(fcst_extents);

                d3.selectAll('.forecast-group').remove();
                var forecast_group = svg.append('g').attr('class', 'forecast-group');

                fcst_extents.forEach(function(d, i) {
                    forecast_group.append('line').attr('class', 'forecast-bound')
                        .attr('x1', x_scale(fcst_extents[i]))
                        .attr('y1', margin)
                        .attr('x2', x_scale(fcst_extents[i]))
                        .attr('y2', height - margin);
                });

                forecast_group.append('text').attr('class', 'forecast-text')
                    .attr('transform',
                        'translate(' +
                        (x_scale(fcst_extents[0]) + 5) + ',' +
                        (height - margin - 10) + ')')
                    .text('Forecast');



            });


            // filter by location 

            var filtered = data.filter(function(d) {
                return d.WBAN == location;
            });

            var by_season = d3.nest()
                .key(function(d) {
                    return d.Season
                })
                .rollup(function(leaves) {

                    return leaves;
                })
                .entries(filtered);

            by_season = by_season.sort(function(a, b) {
                return seasons.indexOf(a.key) < seasons.indexOf(b.key);
            });

            // hacky fix for IE not resorting properly
            var temp = by_season
            by_season = []
            by_season.push(temp[1])
            by_season.push(temp[0])


            d3.selectAll('.temp-stream').remove();

            by_season.forEach(function(season, i) {

                var area_last = d3.svg.area()
                    .interpolate('basis')
                    .x(function(d) {
                        return x_scale(d.Date);
                    })
                    .y0(function(d) {
                        return y_scale(d.Tmax);
                    })
                    .y1(function(d) {
                        return y_scale(d.Tmin);
                    });

                var streams = svg.append('path')
                    .attr('class', 'temp-stream')
                    .attr('fill', colors[i])
                    .attr('d', area_last(season.values));

            });


        }

        update('24243');
        updateTitle('Yakima')

        d3.select('[name=location]').on('change', function() {
            updateTitle(this.options[this.selectedIndex].innerHTML);
            update(this.value);
        });

        function updateTitle(title) {
            d3.select('#location').text(title);
        }

    }


    function transform(d) {

        d.Date = fmt_date.parse(d.YearMonthDay);
        if (d.Season == 'Last Winter') {
            d.Date = add_year(d.Date, 1);
        }

        d.Tmax = +d.Tmax;
        d.Tmin = +d.Tmin;
        return d;

    }

    d3.csv('daily.csv', transform, draw);







    function minMaxExtents(data, keys) {


        var extents = [];
        keys.forEach(function(key) {

            var extent = d3.extent(data, function(d) {
                return d[key]
            });
            extents.push(extent);

        });

        var z = zip(extents);
        var min = d3.min(z[0]);
        var max = d3.max(z[1]);

        return [min, max];

    }

    function zip(arrays) {

        return arrays.reduce(function(acc, arr, i) {

            while (acc.length < arr.length) {
                acc.push([]);
            }
            for (var j = 0; j < arr.length; ++j) {
                acc[j][i] = arr[j];
            }
            return acc;
        }, []);
    }

    function add_year(startDate, numberOfYears) {
        var returnDate = new Date(
            startDate.getFullYear() + numberOfYears,
            startDate.getMonth(),
            startDate.getDate(),
            startDate.getHours(),
            startDate.getMinutes(),
            startDate.getSeconds());
        return returnDate;
    }


})();
