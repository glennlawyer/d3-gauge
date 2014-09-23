

d3.select('body').append('div').attr('class','timer-container')
var G = Timer('.timer-container', 
	      { clazz: 'redhighlight', label:  'GTU' , rescale:1 ,
		   range: 1000,
		   minorTicks: 10,
		   majorTicks: 10,
});
G.currentValue=0
d3.select('body').on('click',function(){G.toggleScale(0.5)})


function update() {
  G.tick();
  if(G._time % 50 ===0) {
    G.freeze() 
    G.setLabel('ACU')
}
//  G.currentValue += 5
  //G.write(G.currentValue)
}

//d3.timer(update,1000)
ttime=50
var clock = setInterval(update, ttime);
setTimeout(function(){
  clearInterval(clock); G.clear()},
	   15*ttime)



//G.write(800,2000)
setTimeout(function(){
  G.setLabel("foo")
  G.freeze(800);
  G.reset();
  G.write(300,600)},2500)

// my running times are from 90 to 750 (once, 2272)
