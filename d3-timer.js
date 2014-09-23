'use strict';
// Modify "Gauge" to display a timer/stopwatch. This is a fork of
//    http://thlorenz.github.io/d3-gauge/
// Thlorenz includes the following attribution:

// heavily inspired by: http://bl.ocks.org/tomerd/1499279
function extend() {
  var target = {}
  for (var i = 0; i < arguments.length; i++) {
    var source = arguments[i]
    for (var key in source) {
      if (source.hasOwnProperty(key)) {
        target[key] = source[key]
      }
    }
  }
  return target
}


var defaultOpts = {
  size :  450 // best not to mess with this, use rescale instead
  , rescale : 1
  , transitionDuration : 500
  , label                      :  'label.text'
  , time                       :  0
  , range                      : 60
  , minorTicks                 :  5
  , majorTicks                 : 12
  , mTickLen                   : 0.12
  , needleWidthRatio           :  0.4
  , needleContainerRadiusRatio :  0.7
};

var proto = Timer.prototype;

/**
 * Creates a timer appended to the given DOM element.
 *
 * Example: 
 *
 * ```js
 *  var simpleOpts = {
 *      size :  100
 *    , min  :  0
 *    , max  :  50 
 *    , transitionDuration : 500
 *
 *    , label                      :  'label.text'
 *    , minorTicks                 :  4
 *    , majorTicks                 :  5
 *    , needleWidthRatio           :  0.6
 *    , needleContainerRadiusRatio :  0.7
 *  }
 *  var timer = Timer(document.getElementById('simple-timer'), simpleOpts);
 *  timer.write(39);
 * ```
 * 
 * @name Timer
 * @function
 * @param el {DOMElement} to which the timer is appended
 * @param opts {Object} timer configuration with the following properties all of which have sensible defaults:
 *  - label {String} that appears in the top portion of the timer
 *  - clazz {String} class to apply to the timer element in order to support custom styling
 *  - size {Number} the over all size (radius) of the timer
 *  - min {Number} the minimum value that the timer measures
 *  - max {Number} the maximum value that the timer measures
 *  - majorTicks {Number} the number of major ticks to draw 
 *  - minorTicks {Number} the number of minor ticks to draw in between two major ticks
 *  - needleWidthRatio {Number} tweaks the timer's needle width
 *  - needleConatinerRadiusRatio {Number} tweaks the timer's needle container circumference
 *  - transitionDuration {Number} the time in ms it takes for the needle to move to a new position
 *  - zones {Array[Object]} each with the following properties
 *    - clazz {String} class to apply to the zone element in order to style its fill
 *    - from {Number} between 0 and 1 to determine zone's start 
 *    - to {Number} between 0 and 1 to determine zone's end 
 * @return {Object} the timer with a `write` method
 */
function Timer (el, opts) {
  if (!(this instanceof Timer)) return new Timer(el, opts);
  this._el = el;
  this._opts = extend(defaultOpts, opts);  
  this._range  =  this._opts.range;
  this._size   =  450;
  this._rescale = this._opts.rescale;
  this._radius =  this._size * 0.9 / 2;
  this._cx     =  this._size / 2;
  this._cy     =  this._cx;
  this._time   =  this._opts.time
  this._majorTicks = this._opts.majorTicks;
  this._minorTicks = this._opts.minorTicks;
  this._mTickLen = this._opts.mTickLen;
  this._needleWidthRatio = this._opts.needleWidthRatio;
  this._needleContainerRadiusRatio = this._opts.needleContainerRadiusRatio;
  this._transitionDuration = this._opts.transitionDuration;
  this._label = this._opts.label;
  this._clazz = opts.clazz;
  this._render();
}

/**
 * Writes a value to the timer and updates its state, i.e. needle position, accordingly.
 * @name write
 * @function
 * @param value {Number} the new timer value, should be in between min and max
 * @param transitionDuration {Number} (optional) transition duration, if not supplied the configured duration is used
 */
proto.write = function(value, transitionDuration) {
  var self = this;

  function transition () {
    var needleValue = value;
    var targetRotation = self._toDegrees(needleValue) + 90
      , currentRotation = self._currentRotation || targetRotation;
    
    self._currentRotation = targetRotation;

    return function (step) {
      var rotation = currentRotation + (targetRotation - currentRotation) * step;
      return 'translate(' + self._cx + ', ' + self._cy + ') rotate(' + rotation + ')'; 
    }
  }

  var needleContainer = this._timer.select('.needle-container');
  
  needleContainer.select('.needle')
    .transition()
    .duration(transitionDuration ? transitionDuration:this._transitionDuration)
    .attrTween('transform', transition)
    .ease("linear")
    .each("start",function(){ needleContainer.selectAll('text')
		       .text("---"); })
    .each("end",function(){  needleContainer.selectAll('text')
			     .text(Math.round(value)); })
}


proto.tick = function(duration){
  var self = this;
  this.currentValue=this._time;
  this._time+= this._tickStep
  this.write(this._time)
  function trans(){
    return function (step) {
      var rotation = self._currentRotation + step;
      return 'translate(' + self._cx + ', ' + self._cy + ') rotate(' + rotation + ')'; 
    }
  }
}
  
proto.reset = function(newtime){ 
  this._time = newtime || 0 
  this.write(this._time,100) 
}

// freeze a needle at the current time
proto.freeze = function(newtime){
  newtime = newtime || this._time;
  var needlePath = this._buildNeedlePath(newtime);
  var needleLine = d3.svg.line()
      .x(function(d) { return d.x })
      .y(function(d) { return d.y })
      .interpolate('basis');
  
  d3.select('.needle-container').insert('path', '.needle')
    .attr('class' ,  'freeze')
    .attr('d'     ,  needleLine(needlePath))
    .attr('transform','translate(' + this._cx + ',' + this._cy + ')')
}

proto.setLabel = function(label){
  d3.select('.d3-timer .label').text(label);
}

proto.clear = function(){
  this._time = 0;
  this.currentValue=0;
  this.write(0,0);
  this._timer.select('.needle-container').selectAll('text').text("---");
  d3.selectAll(".freeze").remove();
  d3.select('.d3-timer .label').text("---");  
}
    

proto.toggleScale = function(tval){
  if(this.toggled){
    this._timer.transition().duration(200).attr('transform','scale(' + this._rescale + ')')
      .attr('width'  ,  this._size * this._rescale)
      .attr('height' ,  this._size * this._rescale);
    this.toggled = false 
  } else {
    this._timer.transition().duration(250).attr('transform','scale(' + tval + ')')
      .attr('width'  ,  this._size * tval)
      .attr('height' ,  this._size * tval);
    this.toggled = true
  }
}

proto._render = function () {
  this._initTimer();
  this._drawOuterCircle();
  this._drawMiddleCircle();
  this._drawInnerCircle();
  this._drawLabel();
  this._drawTicks();
  this._drawNeedle();
  this.write(this._time, 0); // start time, duration of transition
}

proto._initTimer = function () {
  this._timer = d3.select(this._el)
    .append('svg')
    .attr('class'  ,  'd3-timer' + (this._clazz ? ' ' + this._clazz : ''))
    .attr('width'  ,  this._size * this._rescale)
    .attr('height' ,  this._size * this._rescale)
  .attr('transform','scale(' + this._rescale + ')');
  this._tickStep = this._range / (this._majorTicks * this._minorTicks);

}

proto._drawOuterCircle = function () {
  this._timer
    .append('circle')
    .attr('class' ,  'outer-circle')
    .attr('cx'    ,  this._cx)
    .attr('cy'    ,  this._cy)
    .attr('r'     ,  this._radius)
}

proto._drawMiddleCircle = function () {
  this._timer
    .append('circle')
    .attr('class' ,  'middle-circle')
    .attr('cx'    ,  this._cx)
    .attr('cy'    ,  this._cy)
    .attr('r'     ,  0.95 * this._radius)
}

proto._drawInnerCircle = function () {
  this._timer
    .append('circle')
    .attr('class' ,  'inner-circle')
    .attr('cx'    ,  this._cx)
    .attr('cy'    ,  this._cy)
    .attr('r'     ,  (0.95 - this._mTickLen) * this._radius)
}


proto._drawLabel = function () {
  if (typeof this._label === undefined) return;
  this._timer
    .append('text')
    .attr('class', 'label')
    .attr('x', this._cx)
    .attr('y', this._cy / 1.8 + 25) // hard coded, assumes size is fixed
    .attr('dy', 25)
    .attr('text-anchor', 'middle')
    .text(this._label)
}

proto._drawTicks = function () {
  var majorDelta = this._range / this._majorTicks
    , minorDelta = majorDelta / this._minorTicks
    , point
    , minorTPath="", majorTPath="";
  for (var major = 0; major <= this._range; major += majorDelta) {
    var minorMax = Math.min(major + majorDelta, this._range);
    for (var minor = major + minorDelta; minor < minorMax; 
	 minor += minorDelta) {
      var srt =  this._toPoint(minor, (0.95 - (0.6 * this._mTickLen))),
          end =  this._toPoint(minor, 0.95);
      minorTPath += 'M ' + srt.x + ' ' + srt.y + 'L ' +  end.x + ' ' + end.y;
    }
    var srt =  this._toPoint(major,  (0.95 - this._mTickLen)),
        end =  this._toPoint(major, 0.95);
    majorTPath += 'M ' + srt.x + ' ' + srt.y + 'L ' +  end.x + ' ' + end.y;
    if (major < this._range) {
      point = this._toPoint(major, (0.97 - (2 * this._mTickLen)));
      this._timer.append('text')        
        .attr('class', 'major-tick-label')
        .attr('x', point.x)
        .attr('y', point.y+6) // hard coded, assumes size is fixed
        .attr('text-anchor', 'middle')
        .text(major)
    }
  }
  this._timer.append('path').attr('d',minorTPath).attr('class','minor-tick');
  this._timer.append('path').attr('d',majorTPath).attr('class','major-tick');
  
}

proto._drawLine = function (p1, p2, clazz) {
  this._timer
    .append('line')
    .attr('class' ,  clazz)
    .attr('x1'    ,  p1.x)
    .attr('y1'    ,  p1.y)
    .attr('x2'    ,  p2.x)
    .attr('y2'    ,  p2.y)
}

proto._drawNeedle = function () {

  var needleContainer = this._timer
    .append('g')
    .attr('class', 'needle-container');
		
  var midValue = this._range/2;
  
  var needlePath = this._buildNeedlePath(midValue);
  
  var needleLine = d3.svg.line()
      .x(function(d) { return d.x })
      .y(function(d) { return d.y })
      .interpolate('basis');
  
  needleContainer.selectAll('path')    
    .data([ needlePath ])
    .enter().append('path')      
        .attr('class' ,  'needle')
        .attr('d'     ,  needleLine)
        
  needleContainer.append('circle')
    .attr('cx',  this._cx).attr('cy',  this._cy)
    .attr('r',  this._radius * this._needleContainerRadiusRatio / 14)
  needleContainer.append('circle')
    .attr('cx',  this._cx).attr('cy',  this._cy)
    .attr('r',  this._radius * this._needleContainerRadiusRatio / 22)
    .attr('class','needle')
  needleContainer.append('circle')
    .attr('cx',  this._cx).attr('cy',  this._cy)
    .attr('r',  this._radius * this._needleContainerRadiusRatio / 40)
  
  var fontSize = Math.round(this._size / 10);
  needleContainer.selectAll('text')    
    .data([ midValue ])
    .enter()
      .append('text')
        .attr('x'             ,  this._cx)
        .attr('y'             ,  this._size - this._cy / 2 - fontSize)
        .attr('dy'            ,  fontSize / 2)
        .attr('text-anchor'   ,  'middle')
}

proto._buildNeedlePath = function (value) {
  var self = this;

  function valueToPoint(value, factor) {
    var point = self._toPoint(value, factor);
    point.x -= self._cx;
    point.y -= self._cy;
    return point;
  }

  var delta = this._range * this._needleWidthRatio / 10
    , tailValue = value - (this._range * 0.5); 

  var head = valueToPoint(value, 0.85)
    , head1 = valueToPoint(value - delta, 0.06)
    , head2 = valueToPoint(value + delta, 0.06)
  
  var tail = valueToPoint(tailValue, 0.24)
    , tail1 = valueToPoint(tailValue - delta, 0.08)
    , tail2 = valueToPoint(tailValue + delta, 0.08)
    , tail3 = valueToPoint(tailValue - delta*1.2, 0.40)
    , tail4 = valueToPoint(tailValue + delta*1.2, 0.40)
  
  return [head, head1, tail2, tail, tail4, tail, tail3, tail, tail1, head2, head];
}

proto._toDegrees = function (value) {
  // Note: tried to factor out 'this._range * 270' but that breaks things, most likely due to rounding behavior
  return (value / this._range * 360) + 90; // - (this._min / this._range * 270 + 45);
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
