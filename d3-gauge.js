'use strict';

// heavily inspired by: http://bl.ocks.org/tomerd/1499279

var deepXtend = require('deep-extend');
var defaultOpts = require('./defaults/simple');
var d3 = require('d3');

var go = module.exports = Gauge;
var proto = Gauge.prototype;

function Gauge (el, opts) {
  if (!(this instanceof Gauge)) return new Gauge(el, opts);

  this._el = el;

  this._opts = deepXtend(defaultOpts, opts);  

  this._size   =  this._opts.size;
  this._radius =  this._size * 0.9 / 2;

  this._cx     =  this._size / 2;
  this._cy     =  this._cx;

  this._min    =  this._opts.min;
  this._max    =  this._opts.max;
  this._range  =  this._max - this._min;

  this._outer  =  this._opts.outer;
  this._inner  =  this._opts.inner;

  this._majorTicks = this._opts.majorTicks;
  this._minorTicks = this._opts.minorTicks;
  this._tickFontSize = this._opts.tickFontSize || Math.round(this._size / 16)

  this._needle = this._opts.needle;
  this._needleContainer = this._opts.needleContainer;
  
  this._transitionDuration = this._opts.transitionDuration;
  this._zones = [ '_greenZone', '_yellowZone', '_redZone' ];

  this._initZones();
  this._render();
}

proto._initZones = function () {
  var self = this;

  function percentToVal (percent) {
    return self._min + self._range * percent;
  }

  function initZone (zone) {
    self[zone] = self._opts[zone.slice(1)];

    if (self[zone]) { 
      self[zone].from = percentToVal(self[zone].from);
      self[zone].to = percentToVal(self[zone].to);  
    }
  }

  this._zones.forEach(initZone);
}

proto._render = function () {
  this._initGauge();
  this._drawOuterCircle();
  this._drawInnerCircle();
  this._drawLabel();

  this._drawZones();
  this._drawTicks();

  this._drawNeedle();
  this.redraw(this._min, 0);
}

proto._initGauge = function () {
  this._gauge = d3.select(this._el)
    .append('svg:svg')
    .attr('class', 'd3-gauge')
    .attr('width', this._size)
    .attr('height', this._size)
}

proto._drawOuterCircle = function () {
  this._gauge
    .append('svg:circle')
    .attr('cx'            ,  this._cx)
    .attr('cy'            ,  this._cy)
    .attr('r'             ,  this._radius)
    .style('fill'         ,  this._outer.fill)
    .style('stroke'       ,  this._outer.stroke)
    .style('stroke-width' ,  this._outer.width)
}

proto._drawInnerCircle = function () {
  this._gauge
    .append('svg:circle')
    .attr('cx'            ,  this._cx)
    .attr('cy'            ,  this._cy)
    .attr('r'             ,  0.9 * this._radius)
    .style('fill'         ,  this._inner.fill)
    .style('stroke'       ,  this._inner.stroke)
    .style('stroke-width' ,  this._inner.width)
}

proto._drawLabel = function () {
  var labelOpts = this._opts.label;
  if (typeof labelOpts === undefined) return;

  var fontSize = labelOpts.fontSize || Math.round(this._size / 9);
  var halfFontSize = fontSize / 2;

  this._gauge
    .append('svg:text')
    .attr('x', this._cx)
    .attr('y', this._cy / 2 + halfFontSize)
    .attr('dy', halfFontSize)
    .attr('text-anchor', 'middle')
    .text(labelOpts.text)
    .style('font-size', fontSize + 'px')
    .style('fill', labelOpts.fill)
}

proto._drawTicks = function () {
  var majorDelta = this._range / (this._majorTicks.count - 1)
    , minorDelta = majorDelta / this._minorTicks.count
    , point 
    ;

  for (var major = this._min; major <= this._max; major += majorDelta) {
    var minorMax = Math.min(major + majorDelta, this._max);
    for (var minor = major + minorDelta; minor < minorMax; minor += minorDelta) {
      this._drawLine(this._toPoint(minor, 0.75), this._toPoint(minor, 0.85), this._minorTicks.stroke, this._minorTicks.width);
    }

    this._drawLine(this._toPoint(major, 0.7), this._toPoint(major, 0.85), this._majorTicks.stroke, this._majorTicks.width);

    if (major === this._min || major === this._max) {
      point = this._toPoint(major, 0.63);
      this._gauge
        .append('svg:text')
        .attr('x', point.x)
        .attr('y', point.y)
        .attr('dy', this._tickFontSize / 3)
        .attr('text-anchor', major === this._min ? 'start' : 'end')
        .text(major)
        .style('font-size', this._tickFontSize)
        .style('fill', this._majorTicks.textColor)
        .style('stroke-width', '0px')
    }
  }

}

proto._drawLine = function (p1, p2, color, width) {
  this._gauge
    .append('svg:line')
    .attr('x1'            ,  p1.x)
    .attr('y1'            ,  p1.y)
    .attr('x2'            ,  p2.x)
    .attr('y2'            ,  p2.y)
    .style('stroke'       ,  color)
    .style('stroke-width' ,  width)
}

proto._drawZones = function () {
  var self = this;
  function drawZone (zone) {
    if (self[zone]) self._drawBand(self[zone].from, self[zone].to, self[zone].color);
  }

  this._zones.forEach(drawZone);
}

proto._drawBand = function (start, end, color) {
  var self = this;

  function transform () {
    return 'translate(' + self._cx + ', ' + self._cy +') rotate(270)';
  }

  var arc = d3.svg.arc()
    .startAngle(this._toRadians(start))
    .endAngle(this._toRadians(end))
    .innerRadius(0.65 * this._radius)
    .outerRadius(0.85 * this._radius)
    ;

  this._gauge
    .append('svg:path')
    .style('fill', color)
    .attr('d', arc)
    .attr('transform', transform)
}

proto._drawNeedle = function () {

  var needleContainer = this._gauge
    .append('svg:g')
    .attr('class', 'needleContainer');
		
  var midValue = (this._min + this._max) / 2;
  
  var needlePath = this._buildNeedlePath(midValue);
  
  var needleLine = d3.svg.line()
      .x(function(d) { return d.x })
      .y(function(d) { return d.y })
      .interpolate('basis');
  
  needleContainer
    .selectAll('path')
    .data([ needlePath ])
    .enter()
      .append('svg:path')
        .attr('d'             ,  needleLine)
        .style('fill'         ,  this._needle.fill)
        .style('stroke'       ,  this._needle.stroke)
        .style('fill-opacity' ,  this._needle.opacity)
        
  needleContainer
    .append('svg:circle')
    .attr('cx'            ,  this._cx)
    .attr('cy'            ,  this._cy)
    .attr('r'             ,  this._radius * this._needleContainer.radiusRatio / 10)
      .style('fill'         ,  this._needleContainer.fill)
      .style('stroke'       ,  this._needleContainer.stroke)
      .style('fill-opacity' ,  this._needleContainer.opacity)

  var fontSize = Math.round(this._size / 10);
  needleContainer
    .selectAll('text')
    .data([ midValue ])
    .enter()
      .append('svg:text')
        .attr('x'             ,  this._cx)
        .attr('y'             ,  this._size - this._cy / 4 - fontSize)
        .attr('dy'            ,  fontSize / 2)
        .attr('text-anchor'   ,  'middle')
        .style('font-size'    ,  fontSize + 'px')
        .style('fill'         ,  '#000')
        .style('stroke-width' ,  '0px');
}

proto._buildNeedlePath = function (value) {
  var self = this;

  function valueToPoint(value, factor) {
    var point = self._toPoint(value, factor);
    point.x -= self._cx;
    point.y -= self._cy;
    return point;
  }

  var delta = this._range * this._needle.widthRatio / 10
    , tailValue = value - (this._range * (1/ (270/360)) / 2)

  var head = valueToPoint(value, 0.85)
    , head1 = valueToPoint(value - delta, 0.12)
    , head2 = valueToPoint(value + delta, 0.12)
  
  var tail = valueToPoint(tailValue, 0.28)
    , tail1 = valueToPoint(tailValue - delta, 0.12)
    , tail2 = valueToPoint(tailValue + delta, 0.12)
  
  return [head, head1, tail2, tail, tail1, head2, head];
}

proto.redraw = function(value, transitionDuration) {
  var self = this;

  function transition () {
    var needleValue = value;
    // TODO: refactor this ugliness i.e. to ternary
    if (value > self._max) needleValue = self._max + 0.02 * self._range;
    else if (value < self._min) needleValue = self._min - 0.02 * self._range;

    var targetRotation = self._toDegrees(needleValue) - 90
      , currentRotation = self._currentRotation || targetRotation;
    self._currentRotation = targetRotation;
    
    return function (step) {
      var rotation = currentRotation + (targetRotation - currentRotation) * step;
      return 'translate(' + self._cx + ', ' + self._cy + ') rotate(' + rotation + ')'; 
    }
  }

  var needleContainer = this._gauge.select('.needleContainer');
  
  needleContainer
    .selectAll('text')
    .text(Math.round(value));
  
  var needle = needleContainer.selectAll('path');
  needle
    .transition()
    .duration(transitionDuration ? transitionDuration : this._transitionDuration)
    .attrTween('transform', transition);
}

proto._toDegrees = function (value) {
  // Note: tried to factor out 'this._range * 270' but that breaks things, most likely due to rounding behavior
  return value / this._range * 270 - (this._min / this._range * 270 + 45);
}

proto._toRadians = function (value) {
  return this._toDegrees(value) * Math.PI / 180;
}

proto._toPoint = function (value, factor) {
  var len = this._radius * factor;
  var inRadians = this._toRadians(value);
  return {
    x: this._cx - len * Math.cos(inRadians),
    y: this._cy - len * Math.sin(inRadians)
  };
}