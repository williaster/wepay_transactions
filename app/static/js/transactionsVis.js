function makeVisualization(dataFile, loop, maxpauseMS, callbackDomain) {
	d3.select("#loading").remove();
	
	d3.wepay._maxTransactions = 50000, 	// max transactions summarized in the timeline; 
								  	  	// without an upper limit, could exceed memory.
	d3.wepay._maxPauseMS      = maxpauseMS,  	
										// Maximum pause time between transaction animations.
										// Deviates from reality more by minimizing time
									  	// gap between transactions, but decreasing makes the
										// the speed slider more responsive, especially for
										// slow speeds (speed change doesn't take effect until 
									 	// the next-queued txn fires);
	d3.wepay._startDelayMS    = 2000, 
	d3.wepay._speedMultiplier = 5,
	d3.wepay._callbackDomain  = callbackDomain,
	d3.wepay._dataFile    	  = dataFile,  
	d3.wepay._loop        	  = loop,   
	d3.wepay._speedDomain     = [1,1000],
	d3.wepay._txnLifetimeDomain = [400, 5000];

	// The following define the sizes and offsets of the various visualization components
	// (whole vis, map, timeline, sliders, counter, and wepay logo)
	var visWidth   = 1200,
		visHeight  = 650;
	
	var mapMargins = { top: 0, right: 40, bottom: 0.24*visHeight, left: 0.2*visWidth },
		mapWidth   = visWidth,
		mapHeight  = visHeight;	

	var timelineMargins = { top: (mapHeight - mapMargins.bottom - mapMargins.top) + 20,
							right: mapMargins.right, bottom: 40, left: mapMargins.left, 
							ctLabelX: 5, ctLabelY: -5},
		timelineWidth   = visWidth,
		timelineHeight  = visHeight;

	var counterMargin = { top: 200, right: 0,  bottom: 0, left: 25, labelLeft: 0, labelTop: 25 },
		counterWidth  = 300,
		counterHeight = 300;

	var slidersMargin = { top: counterMargin.top + 20, right: 320, bottom: 15, left: 0, 
						  labelSpace: 15, speedMargin: 11 },
		slidersWidth  = 500,
		slidersHeight = 500;

	var logoMargin = { top: 100, right: 0, bottom: 0, left: 25 },
		logoWidth  = 300,
		logoHeight = 200;

	// Create the visualization svg, other components are added to this selection
	var vis = d3.select("#vis").append("svg")
		.attr("class", "vis")
		.attr("width",  visWidth)
		.attr("height", visHeight);

	var sliderContainer = vis.append("svg") // container for all sliders
		.attr("class", "slider-container")
		.attr("width",  slidersWidth)
		.attr("height", slidersHeight)
	  .append("g")
	  	.attr("transform", "translate(" + slidersMargin.left + "," + slidersMargin.top + ")");

	// Initialize map, timeline, counter, and logo components with desired properties
	d3.wepay._map = d3.wepay.map()
		.width(mapWidth) // height scaled automatically
		.margin(mapMargins);

	d3.wepay._timeline = d3.wepay.timeline()
		.width(timelineWidth)
		.height(timelineHeight)
		.margin(timelineMargins);

	d3.wepay._counter = d3.wepay.counter()
		.count(1010) 				 // start count
		.label("Total transactions") // label text
		.width(counterWidth)
		.height(counterHeight)
		.margin(counterMargin);

	d3.wepay._logo = d3.wepay.logo()
		.width(logoWidth)
		.height(logoHeight)
		.margin(logoMargin);

	// Initialize sliders
	d3.wepay._speedSlider = d3.wepay.slider()
		.domain(d3.wepay._speedDomain)
		.initVal(d3.wepay._speedMultiplier)
		.updateVal(function(newVal) { d3.wepay._speedMultiplier = newVal; })
		.getLabelVal(function(newVal) { return d3.wepay.util.numWithCommas(Math.floor(newVal)) + "x"; })
		.labelText("real time")
		.class("speed-slider")
		.scale(d3.scale.log());

	d3.wepay._lifetimeSlider = d3.wepay.slider()
		.margin( { top: 50, right: 0, bottom: 0, left: 25, labelSpace: 11, speedMargin: 11 })
		.domain(d3.wepay._txnLifetimeDomain)
		.initVal(d3.wepay._map.txnLifetime())
		.updateVal(d3.wepay._map.txnLifetime)
		.labelText("arc lifetime")
		.class("lifetime-slider")
		.scale(d3.scale.log());

	// Create components, within the DOM selection that calls them
	vis.call(d3.wepay._map);
	vis.call(d3.wepay._timeline);   
	vis.call(d3.wepay._counter); 
	vis.call(d3.wepay._logo);	
	sliderContainer.call(d3.wepay._speedSlider);
	sliderContainer.call(d3.wepay._lifetimeSlider);

	queue() // load data then start, 
			// nb: .defer() passes a callback to the funtion, too
		.defer(d3.wepay.util.getData, dataFile)
		.await(d3.wepay._map.start);
}