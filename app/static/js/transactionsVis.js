function makeVisualization(dataFile, loop, maxpauseMS, callbackDomain) {
	d3.select("#loading").remove();
	
	d3.wepay._maxTransactions = 50000, 	// max transactions summarized in the timeline; 
								  	  	// without an upper limit, could exceed memory.
	d3.wepay._maxPauseMS      = 2000,  	// Maximum pause time between transaction animations.
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
	d3.wepay._timelineCts 	  = [],
	d3.wepay._txns        	  = [],
	d3.wepay._timeIdx     	  = 0,
	d3.wepay._txnIdx      	  = 0;

	var visWidth   = 1200,
		visHeight  = 650;
	
	var mapMargins = { top: 0, right: 40, bottom: 0.24*visHeight, left: 0.2*visWidth },
		mapWidth   = visWidth,
		mapHeight  = visHeight;	

	var timelineMargins = { top: (mapHeight - mapMargins.bottom - mapMargins.top) + 20,
							right: mapMargins.right, 
							bottom: 40, 
							left: mapMargins.left, 
							ctLabelX: 5, ctLabelY: -5},
		timelineWidth   = visWidth,
		timelineHeight  = visHeight;

	var counterMargin = { top: 200, right: 0,  bottom: 0, left: 25, labelLeft: 0, labelTop: 25 },
		counterWidth  = 300,
		counterHeight = 300;


	// Create vis svg, vis components are added to this selection
	var vis = d3.select("#vis").append("svg")
		.attr("class", "vis")
		.attr("width",  visWidth)
		.attr("height", visHeight);

	// Create and initialize visualziation components
	d3.wepay._map = d3.wepay.map()
		.width(mapWidth)
		.margin(mapMargins);

	d3.wepay._timeline = d3.wepay.timeline()
		.width(timelineWidth)
		.height(timelineHeight)
		.margin(timelineMargins);

	d3.wepay._counter = d3.wepay.counter()
		.count(1010)
		.label("Total transactions")
		.width(counterWidth)
		.height(counterHeight)
		.margin(counterMargin);

	var sliderContainer = vis.
	d3.wepay._sliders =

	vis.call(d3.wepay._map);  		// create map
	vis.call(d3.wepay._timeline);   // create timeline
	vis.call(d3.wepay._counter);

	queue()
		.defer(d3.wepay.util.getData, dataFile)
		.await( d3.wepay._map.start );

	// can hook be used for when map is loaded to proceed to data loading?
}