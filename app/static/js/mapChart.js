d3.wepay = d3.wepay || {}; // declare namespace if it doesn't exist 

d3.wepay.map = function mapChart() {
	
	// Private variables
	var margin	 		  = { top: 0, right: 0, bottom: 0, left: 0 },
		width 			  = 1200,
		height 		 	  = 650,
		w_to_h_ratio	  = width / height,
		mapScale          = (470/1200)*(width  - margin.left - margin.right),
		scale_to_w_ratio  = mapScale / (width  - margin.left - margin.right),
		mapFile 		  = "../static/data/maps/countries2.topo.json", // world map data
		sky_to_land_ratio = 1.4, 	// how 'high' the sky shell is
		txnDurationIn     = 2, 	 	// multiplier for duration of arc creation 
		txnDurationOut    = 1,	 	// multiplier for duration of arc removal
		txnLifetime       = 800,   	// how long arc is visible, in ms
		txnHeadStartR     = 3,		// start radius of the arc head
		txnHeadEndR       = 10, 	// end   radius of the arc head
		mapSvg, projection, sky, landPath, skyPath, arcStrokeWidth, arcColor;
	
	// Chart closure, this is the return value of the module
	function map(_selection) {
    	_selection.each(function(_data) { // nb: data not used, this draws map
    		
    		var mapWidth   = width  - margin.left - margin.right,
				mapHeight  = height - margin.top  - margin.bottom;

			// There are two projection levels / shells for 3D effect: land and sky
			land = d3.geo.orthographic()
			    .scale(mapScale) // TODO: this needs to scale/update with width/height
			    .rotate([105,-10,0]) 					// center on USA
			    .translate([mapWidth / 2, mapHeight + margin.top]) 	// upper hemisphere only
			    .clipAngle(90)
			    .precision(.1);

			sky = d3.geo.orthographic()
			    .scale(sky_to_land_ratio * land.scale()) 
			    .rotate([105,-10,0]) 
			    .translate([mapWidth / 2, mapHeight + margin.top])
			    .clipAngle(90);

			// Paths, lines, scales for drawing on the land and sky
			landPath = d3.geo.path() 
				.projection(land);

			skyPath = d3.svg.line()
				.x(function(d) { return d[0]; }) 
				.y(function(d) { return d[1]; })
				.interpolate("cardinal") // will use only 3 points, must smooth
				.tension(0.0); 			 // 1 = straight/kinked lines

			arcStrokeWidth = d3.scale.linear()
				.range([1.5,8])
				.domain([0,1000])
				.clamp(true); // no massive lines for txn amts outside the domain

			arcColor = d3.scale.category10();

			// Create map svg handle
			mapSvg = d3.select(this).append("svg")
				.attr("class", "map")
				.attr("width",  width)
				.attr("height", mapHeight + margin.top) // not including bottom gives 
  			  .append("g") 								// desired effect for bottom margins
				.attr("transform", "translate(" + margin.left + ", " + margin.top + ")");

			// layer 1: water, a geojson 'sphere type'
			var ocean = mapSvg.append("path")
				.datum( { type: "Sphere" } )
				.attr("class", "globe")
				.attr("d", landPath);	

			// layer 2: lat / long lines
			var graticule = d3.geo.graticule();

			var linesLatLong = mapSvg.append("path")
				.datum(graticule)
				.attr("class", "graticule")
				.attr("d", landPath);

			// layer 3: country outlines from geojson data
			d3.json(mapFile, function(error, world) {	
				if (error) return console.log(error);
	
				mapSvg.append("path")
					.datum( topojson.feature(world, world.objects.countries) )
					.attr("class", "land")
					.attr("d", landPath);
			});

			// Add svg style defs for arc head


    	});
    }

    // Public methods for displaying transactions, etc. -----------------------
    
    /* 
     * Accessor for a handle to the map svg
     */
    map.select = function() {
    	return mapSvg;
    }
	/*
	 * Creates txn groups with the passed txn data
	 */
	map.buildTxnGroups = function(txns) {
		// Remove old transactions group if it exists
		if (d3.wepay._map.select().select("g")) { 
			d3.wepay._map.select().select("g.transactions").remove(); 
		}

		// Create new ones with the passed data
		d3.wepay._txnGs = d3.wepay._map.select().append("g")
			.attr("class", "transactions")
			.selectAll("g")
			.data(txns)
		  .enter().append("g")
		  	.attr("class", "transaction-group");
	}

	/*
	 * Starts the transaction visualization 
	 */
	map.start = function() {
		d3.timer(recursiveTxnCallback(), d3.wepay._startDelayMS); 
	}

    // Public getter/setter methods -------------------------------------------
    // If setting a value, returns the chart for method chaining pattern.
    map.margin = function(_m) {
    	if (!arguments.length) return margin;
    	margin = _m; 
    	return this;
    }
    map.width = function(_w) {
    	if (!arguments.length) return width;
    	width    = _w,
    	height   = _w / w_to_h_ratio,
    	mapScale = _w * scale_to_w_ratio;
    	return this;
    }
	map.height = function(_h) {
    	if (!arguments.length) return height;
    	height   = _h,
    	width    = _h * w_to_h_ratio, 
    	mapScale = width * scale_to_w_ratio;
    	return this;
    }
    map.txnDurationIn = function(_in) {
    	if (!arguments.length) return txnDurationIn;
    	txnDurationIn = _in; 
    	return this;
    }
	map.txnDurationOut = function(_out) {
    	if (!arguments.length) return txnDurationOut;
    	txnDurationOut = _out; 
    	return this;
    }
    map.txnLifetime = function(_l) {
    	if (!arguments.length) return txnLifetime;
    	txnLifetime = _l; 
    	return this;
    }

 	// Private functions ------------------------------------------------------
 	
 	/* 
	 * Recursive function for creating and returning transaction callbacks
	 * returns new functions because timers are mapped to instances, so 
	 * terminating a single instance in a timer would stop all future callbacks
 	 * ( see http://bit.ly/1GQ6AhU )
	 */
	function recursiveTxnCallback() {
		// Base case: no more transactions, so will update data
		if (d3.wepay._txnIdx >= d3.wepay._txnGs.size()) { 
			return function() { 
				d3.wepay.util.updateData( d3.wepay._dataFile );
				return true; 
			};
		} else if (d3.wepay._txnIdx == d3.wepay._txnGs.size() - 1) { // last transaction
			return txnCallbackFactory(d3.wepay._maxPauseMS); 

		} else { // Compute next interval based on real time between curr and next txns
			var currTxnData = d3.wepay._txnGs[0][d3.wepay._txnIdx].__data__,
				nextTxnData = d3.wepay._txnGs[0][d3.wepay._txnIdx + 1].__data__,
				intervalMS  = (nextTxnData.time - currTxnData.time) / d3.wepay._speedMultiplier, 
				intervalMS  = Math.min(d3.wepay._maxPauseMS, intervalMS);

			return txnCallbackFactory(intervalMS); 
		}
	}

	/*
	 * Where the magic happens!
	 *
	 * Returns a function that, when called, shows the transaction corresponding
	 * to the current wepay._txnIdx value, increments wepay._txnIdx, sets a
	 * timer for the next recursive callback to be called in interval ms, and 
	 * returns true in order to terminate the callback function
	 */
	function txnCallbackFactory(interval) {
		return function() { 
			var txnG = d3.wepay._txnGs[0][d3.wepay._txnIdx];
			
			showTransaction(txnG); // animate arcs
			
			if (d3.wepay._counter) { // update counter if it exists
				d3.wepay._counter.updateCounter(++d3.wepay._txnCt);  	
			} 
			if (d3.wepay._timeline) { // update timeline if it exists
				d3.wepay._timeline.addTimelineCounts();        	
			}

			d3.wepay._txnIdx++;
			d3.timer(recursiveTxnCallback(), interval); // recurse after pause

			return true; // stops this callback instance (recurse not affected)
		};
	}

    /*
     * Initializes the arc, arc shadow, and arc head components of a transaction
	 * then animates them based on arc length
	 */
	function showTransaction(txnG) {
		var txnColor = arcColor(d3.wepay._txnIdx % 10);

		// before animation, initialize arc, arc shadow, and arc head
		var arc = d3.select(txnG).append("path")
			.attr("class", "transaction arc")
			.attr("stroke", txnColor)
			.attr("stroke-width", function(d) { return arcStrokeWidth( d.amount ); })
			.attr("d", function(d) { return skyPath( projectTransaction(d) ); })
			.style("display", "none");

		var arcShadow = d3.select(txnG).append("path")
			.attr("class", "transaction shadow")
			.attr("stroke-width", function(d) { return arcStrokeWidth( d.amount ); })
			.attr("d", landPath)
			.style("display", "none");

		var arcHead = d3.select(txnG).append("circle")
			.attr("class", "arc-head")
			.attr("fill", txnColor)
			.attr("filter", "url(#blur)")
			.attr("cx", -1000)
			.attr("cy", -1000)
			.attr("r", function(d) { return 1; });

		// now animate
		animateTransaction(arc, arcShadow, arcHead);
	}

 	/*
 	 * Animates a transactio arc. Arcs are animated based on a css dashed line 
 	 * trick, while the arc head positions are computed explicitly through an 
 	 * attrTween based on the arc path.
	 * 
	 * This is wrapped into a function to sync animation times for all components
	 * of a transaction, which depend on the length of the arc
	 */
	function animateTransaction(arc, arcShadow, arcHead) {

		var arc_length    = arc.node().getTotalLength(),
			shadow_length = arcShadow.node().getTotalLength();

		arc
			.attr("stroke-dasharray",  arc_length + " " + arc_length)
			.attr("stroke-dashoffset", arc_length)
			.style("display", "")
			.transition()
				.duration(arc_length*txnDurationIn)
				.attr("stroke-dashoffset", 0)
			.transition()
				.delay(txnLifetime)
				.duration(arc_length*txnDurationOut)
				.attr("stroke-dashoffset", -arc_length);

		arcShadow
			.attr("stroke-dasharray",  shadow_length + " " + shadow_length)
			.attr("stroke-dashoffset", shadow_length)
			.style("display", "")
			.transition()
				.duration(arc_length*txnDurationIn)
				.attr("stroke-dashoffset", 0)
			.transition()
				.delay(txnLifetime)
				.duration(arc_length*txnDurationOut)
				.attr("stroke-dashoffset", -shadow_length)

		arcHead
		    .transition()
	        	.duration(arc_length*txnDurationIn)
	        	.attrTween('cx', function (d, i, a) {
			        return function (t) {
			          	return arc.node().getPointAtLength(t * arc_length).x;
			    	};
    			})
    			.attrTween('cy', function (d, i, a) {
			        return function (t) {
			          	return arc.node().getPointAtLength(t * arc_length).y;
			    	};
    			})
    		.attr("r", function(d) { return txnHeadStartR; }) 
    		.transition()
				.attr("r", function(d) { return txnHeadEndR; })
				.attr("opacity", 0.5)
				.duration((txnDurationIn + txnDurationOut) * arc_length + txnLifetime)
				.each("end", function() { this.parentNode.remove(); }); 
    }

	// Interpolates the position of a location along an arc
	function locationAlongArc(start, end, loc) {
		var interpolator = d3.geo.interpolate(start, end);
		return interpolator(loc);
	}

	// Returns 3-element array of projected coordinates for a transaction,
	// the outer elements are projected on land, the middle in the sky
	function projectTransaction(transaction) {
	    var source = eval(transaction.from_coord),
	        target = eval(transaction.to_coord),
	        mid    = locationAlongArc(source, target, 0.5);

	    return [ land(source), sky(mid), land(target) ];
	}

	// Finally, return map closure
    return map;
}
