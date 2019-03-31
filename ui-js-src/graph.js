import $ from 'jquery';
import d3 from './d3-import';

export function showRadialPercentage(score, passed) {
  $('#score-radial').attr("data-percentage", (score * 100).toFixed(0) + '%');

  const margin = 40;

  const wrapper = document.getElementById('score-radial');
  const start = 0;
  const end = parseFloat(wrapper.dataset.percentage);

  let colours;
  if (passed) {
    colours = {
      fill: '#' + wrapper.dataset.fillColour,
      track: '#' + wrapper.dataset.trackColour,
      text: '#' + wrapper.dataset.textColour,
      stroke: '#' + wrapper.dataset.strokeColour,
    }
  } else {
    colours = {
      fill: '#cc0000',
      track: '#' + wrapper.dataset.trackColour,
      text: '#660000',
      stroke: '#' + wrapper.dataset.strokeColour,
    }
  }

  $('.results-text').css('color', colours.text);

  const radius = 100;
  const border = wrapper.dataset.trackWidth;
  const strokeSpacing = wrapper.dataset.strokeSpacing;
  const endAngle = Math.PI * 2;
  const formatText = d3.format('.0%');
  const boxSize = radius * 2 + margin;
  const step = end < start ? -0.01 : 0.01;
  let count = end;
  let progress = start;

  //Define the circle
  const circle = d3.arc()
    .startAngle(0)
    .innerRadius(radius)
    .outerRadius(radius - border);

  //setup SVG wrapper
  const svg = d3.select(wrapper)
    .append('svg')
    .attr('width', boxSize)
    .attr('height', boxSize);

  // ADD Group container
  const g = svg.append('g')
    .attr('transform', 'translate(' + boxSize / 2 + ',' + boxSize / 2 + ')');

  //Setup track
  const track = g.append('g').attr('class', 'radial-progress');
  track.append('path')
    .attr('class', 'radial-progress__background')
    .attr('fill', colours.track)
    .attr('stroke', colours.stroke)
    .attr('stroke-width', strokeSpacing + 'px')
    .attr('d', circle.endAngle(endAngle));

  //Add colour fill
  const value = track.append('path')
    .attr('class', 'radial-progress__value')
    .attr('fill', colours.fill)
    .attr('stroke', colours.stroke)
    .attr('stroke-width', strokeSpacing + 'px');

  //Add text value
  const numberText = track.append('text')
    .attr('class', 'radial-progress__text')
    .attr('style','font-size: 30pt;')
    .attr('fill', colours.text)
    .attr('text-anchor', 'middle')
    .attr('dy', '.9rem');

  function update(progress) {
    //update position of endAngle
    value.attr('d', circle.endAngle(endAngle * progress));
    //update text value
    numberText.text(formatText(progress));
  }

  (function iterate() {
    //call update to begin animation
    update(progress);
    if (count > 0) {
      //reduce count till it reaches 0
      count--;
      //increase progress
      progress += step;

      //Control the speed of the fill
      setTimeout(iterate, 10);
    }
  })();
}

/**
 * Shows a line graph on the page
 * @param {number[]} yData y values of data points (x is index)
 * @param {[number, number]} yRange min and max of y
 *    not gotten from yData because yData may not span its range
 * @param {string} selector
 *    where on the DOM to insert the graph
 */
export function showGraph(yData, yRange, selector, graphType, graphTitle) {

  let style;
  let fill;
  let suffix;
  if (graphType == 'scores') {
    style = 'stroke: steelblue;';
    fill = ' fill: #679fce;';
    suffix = '%';
  } else {
    style = 'stroke: green;';
    fill = ' fill: #36a049;'
    suffix = '$'
  }

  const v_width = Math.min($("#app").width()*0.9, 360);
  const margin = { top: 40, right: 50, bottom: 50, left: 50 };
  const width = v_width - margin.left - margin.right;
  const height = width - margin.top - margin.bottom;

  const data = yData.map((y, x) => [x + 1, y || 0]);

  const x = d3.scaleLinear().range([0, width]);
  const y = d3.scaleLinear().range([height, 0]);

  x.domain([0, data.length+1]);
  y.domain(yRange);

  const xAxis = d3.axisBottom(x).ticks((data.length+1)%15);
  const yAxis = d3.axisLeft(y);

  const line = d3.line()
    .x(d => x(d[0]))
    .y(d => y(d[1]));

  const svg = d3.select(selector).append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .attr("style", "display:flex;")
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .attr("style", style)
    .call(xAxis);

  svg.append("g")
    .attr("class", "y axis")
    .attr("style", style)
    .call(yAxis)
    .append("text")
    // .attr("y", 6)
    .attr("dy", ".71em")
    .attr("x", 5)
    .style("text-anchor", "start")
    .text(graphTitle);

  svg.append("path")
    .datum(data) // 10. Binds data to the line
    .attr("class", "line") // Assign a class for styling
    .attr("style",style)
    .attr("d", line); // 11. Calls the line generator

  svg.selectAll("line-circle")
    .data(data)
    .enter().append("circle")
      .attr("style",style+fill)
      .attr("r", 4)
      .attr("cx", d => x(d[0]))
      .attr("cy", d => y(d[1]));

  const focus = svg.append("g")
    .attr("class", "focus")
    .style("display", "none");

  focus.append("circle")
    .attr("r", 7)
    .attr("fill-opacity", 0.3)

  focus.append("text")
    .attr("x", 15)
    .attr("dy", ".55em");

  svg.append("rect")
    .attr("class", "overlay")
    .attr("width", width)
    .attr("height", height)
    .on("mouseover", function () { focus.style("display", null); })
    .on("mouseout", function () { focus.style("display", "none"); })
    .on("mousemove", mousemove);

  function mousemove() {
    const x0 = x.invert(d3.mouse(this)[0])
    let i = Math.round(x0)
    if (i > data.length) {
      i = data.length
    } else if (i < 1) {
      i = 1;
    }
    focus.attr("transform", "translate(" + x(i) + "," + y(data[i - 1][1]) + ")");
    // focus.attr("class", "focus animated infinite zoomIn")
    focus.select("text").text(data[i - 1][1]+suffix);
  }

}
