d3.wepay = d3.wepay || {}; // declare namespace if it doesn't exist 

d3.wepay.timeline = function timelineChart() {

	// Private variables ------------------------------------------------------
	var margin  = { top: 0, right: 0, bottom: 0, left: 0, ctLabelX: 5, ctLabelY: -5},
		width   = 1200,
		height  = 650,
		nTimelineBins  = 75, // only approx, depends on vals
		nTimelineTicks = 15,
		xLabel         = "Time",
		yLabel         = "# Transactions",
		timelineSvg, timelineHist, timelineHistBins, timelineBars, 
		timelineHeight, timeScale, ctScale, timeAxis, timelineAxis;

	// Chart closure, returned
	function timeline(_selection) {
		_selection.each(function(_data) { 
			var timelineWidth  = width  - margin.left - margin.right;
			timelineHeight = height - margin.top  - margin.bottom;

			timelineSvg = d3.select(this).append("svg")
				.attr("class", "txn-timeline")
				.attr("width",  width)
				.attr("height", height)
			  .append("g")
				.attr("transform", "translate(" + margin.left + ", " + margin.top + ")");
			
			timeScale = d3.time.scale()
				.range([0, timelineWidth]);

			ctScale = d3.scale.linear()
				.range([timelineHeight, 0]);
			
			timeAxis = d3.svg.axis()
				.scale(timeScale)
				.tickSize(5)
				.orient("bottom");

			timelineHist = timelineSvg.append("g")
				.attr("class", "timeline-histogram");

			timelineAxis = timelineSvg.append("g")
				.attr("class", "timeline-axis")
				.attr("transform", "translate(0," + timelineHeight + ")");

			timelineAxis.append("text") // y-label
				.attr("class", "timeline-ylabel")
				.attr("text-anchor", "middle")
				.attr("transform", "translate(-10," + -timelineHeight/2 + ")rotate(-90)")
			  	.text(yLabel);

			timelineAxis.append("text") // x-label
				.attr("class", "timeline-xlabel")
				.attr("text-anchor", "middle")
				.attr("transform", "translate(" + timelineWidth / 2 + "," + 0.9 * margin.bottom + ")")
			  	.text(xLabel);

		});
	}
	// Public getter/setter methods -------------------------------------------
	// If setting a value, returns the chart for method chaining pattern.
    timeline.margin = function(_m) {
    	if (!arguments.length) return margin;
    	margin = _m; 
    	return this;
    }
    timeline.width = function(_w) {
    	if (!arguments.length) return width;
    	width = _w;
    	return this;
    }
	timeline.height = function(_h) {
    	if (!arguments.length) return height;
    	height = _h;
    	return this;
    }
   

	// Public methods ---------------------------------------------------------
	/*
	 * Updates the time and count domains based on transaction values
	 * Computes transactions counts over time using the d3 histogram layout
	 * but removes actual txn objs fom the resulting binned counts for space
	 *
	 * @param duration  specifies the duration of the change in domain
	 */
	timeline.updateTimelineCts = function(duration) {
		// Update the domain to the current transactions, needed for bins
		timeScale
			.domain(d3.extent(d3.wepay._txns, function(d) { return d.time; }));

		// Update axis ticks once domain known, else default 1970 vals :(
		timelineAxis.transition().duration(duration).call(timeAxis); 


		d3.wepay._timelineCts = d3.layout.histogram()
			.value(function(d) { return d.time; })
			.bins( timeScale.ticks(nTimelineBins) )
			(d3.wepay._txns)
			.map(function(d, i) { // removes txns from bins to save space; only need cts
							      // converts dx to Date, instead of ms offset
				return { x: d.x, dx: d.dx, y: d.y, 
						 curr_y: 0,  x1: new Date( d.x.getTime() + d.dx ), }; 
			}); 

		// Update ct domain based on computed ct values
		ctScale.domain([0, d3.max(d3.wepay._timelineCts, function(d) { return d.y; })]);
	}
	
	/*
	 * Sets bin.curr_y of d3.wepay._timelineCts whose idx are < fillToIdx to bin.y
	 * (bin.y represents the final height of the bar, curr_y it's animation position)
	 * If this condition is not met bin.curr_y is set to = 0;
	 */
	timeline.resetTimelineCts = function(fillToIdx) {
		for (var i=0; i < d3.wepay._timelineCts.length; i++) {
			
			var currTxnBin = d3.wepay._timelineCts[i],
				newValue   = i < fillToIdx ? currTxnBin.y : 0;
			
			currTxnBin.curr_y = newValue; 
		}
	}
	
	/*
	 * Returns the maximum idx of d3.wepay._timelineCts bin that contains one or more 
	 * txns from txns (bins up to this value will be filled by another value)
	 */
	timeline.getFillToIdx = function(txns) { //, timeline_cts) {
		var timelineCts = d3.wepay._timelineCts,
			maxTime 	= txns[txns.length - 1].time.getTime(),
			fillToIdx   = -1;

		// note: this does not guarantee that the counts around the old to new interface 
		//		 is perfect but it is within a few counts; specifically, old data that falls
		// 		 into a new bin, is not represented in the final displayed counts in that bin.
		for (var binIdx = 0; binIdx < timelineCts.length; binIdx++) {
			if (maxTime > timelineCts[binIdx].x.getTime()) {
				fillToIdx = binIdx;
			}
		}
		return fillToIdx;
	}

	/*
	 * Initializes the timeline by creating the Histogram bars and bins. Their height
	 * values are set to the wepay._timeLineCts bin's curr_y values.
	 */
	timeline.initTimeline = function() {
		// Remove bars if they already exist
		if (timelineHist.selectAll("g")) { timelineHist.selectAll("g.timeline-bar").remove(); }
		
		// set data for histogram bins
		timelineHistBins = timelineHist.selectAll(".timeline-bar")
			.data(d3.wepay._timelineCts);

		timelineHistBins.enter().append("g") // add bins
		  	.attr("class", "timeline-bar")
		  	.attr("transform", function(d) {
		  		return "translate(" + timeScale(d.x) + "," + ctScale(d.curr_y) + ")";
		  	}) 
		  	.on("mouseover", function(d, i) { mouseoverBin(this, d, i); })
			.on("mouseout",  function(d, i) { mouseoutBin(this, d, i); });
	
		timelineBars = timelineHistBins.append("rect") // add rectangles
			.attr("width",  function(d) { return timeScale( d.x1 ) - timeScale( d.x ); })
			.attr("height", function(d) { return timelineHeight - ctScale( d.curr_y ); });	
	}

	/*
	 * Updates x (usually static) and y values of bins on timeline
	 */
	timeline.updateTimeline = function() {
		// rects are individually drawn from the bottom up (ie height), but 
		// 		the top of the container is y=0. therefore must update both
		// 		translate and height
		timelineHistBins 
			.attr("transform", function(d) {
		  	return "translate(" + timeScale(d.x) + "," + ctScale(d.curr_y) + ")";
			});

		timelineBars
			.attr("width", function(d) {
				return timeScale( d.x1 ) - timeScale( d.x );
			})
			.attr("height", function(d) { 
				return timelineHeight - ctScale( d.curr_y ); 
			});
		
		// update text label if it exists
		var label = d3.select("g[id^='bar-ct-label-']");
		if (label[0][0]) updateBarCtLabel(label); 	
	}

	/*
	 * Manages changes in displayed counts for a single txn_idx/txn increment. 
	 * increases ct in curr txn timeline bin, including updating the time bin idx,
	 * and updating "timeline-curr" classes based on the current timeline bin.
	 */
	timeline.addTimelineCounts = function() {

		var currTxn 	 = d3.wepay._txns[d3.wepay._txnIdx],
			currBin 	 = d3.wepay._timelineCts[d3.wepay._timeIdx],
			isLastTxn    = d3.wepay._txnIdx == (d3.wepay._txns.length - 1), 
			isLastBin    = !(d3.wepay._timeIdx + 1 < d3.wepay._timelineCts.length),
			incrementBin = !(currTxn.time < currBin.x1); 

		if (incrementBin && !isLastBin) { // increment time index and recurse
			d3.select(timelineBars[0][d3.wepay._timeIdx]).classed("timeline-curr", false);
			d3.wepay._timeIdx++;
			return timeline.addTimelineCounts();
		} else { // highlight curr bar, increment count in this bin and update display
			d3.select(timelineBars[0][d3.wepay._timeIdx]).classed("timeline-curr", true);
			currBin.curr_y++;
			timeline.updateTimeline();
		}
		if (isLastTxn) { // remove highlight if last txn
			d3.select(timelineBars[0][d3.wepay._timeIdx]).classed("timeline-curr", false);
		}
	}


	// Private methods --------------------------------------------------------
	/*
	 * Adds a hover class to the passed bin rect, and adds a text object to the 
	 * rect parent (so it's in front of other rect) that displays the number 
	 * of counts for the bin.
	 */
	function mouseoverBin(rect, d, i) {
		d3.select(rect).classed("timeline-hover", true);
		addBarCtLabel(timelineHist, d, i);
	}

	/*
	 * Removes the hover class from the passed DOM rectangle.
	 * Also removes the count label.
	 */
	function mouseoutBin(rect, d, i) {
		d3.select(rect).classed("timeline-hover", false);
		d3.select("g[id^='bar-ct-label-']").remove();
	}

	/*
	 * Adds a tooltip to the specified txn timeline bin index displaying 
	 * the bin's curr_y as the number of transactions.
	 */
	function addBarCtLabel(selection, d, i) {
	 	// Remove all labels first
	 	d3.select("g[id^='bar-ct-label-']").remove();

	 	// Determine offset/anchor/plurality based on idx and current count value
	 	var textAnchor = i < d3.wepay._timelineCts.length / 2 ? "start" : "end",
			translateX = i < d3.wepay._timelineCts.length / 2 ? 
						     margin.ctLabelX : 2 * margin.ctLabelX,
			text 	   = d3.wepay.util.numWithCommas(d.curr_y) + 
				   		 ( d.curr_y == 1 ? " transaction" : " transactions" );

		var ctLabel = selection.append("g") 
			.attr("class", "bar-ct-label")
			.attr("id", "bar-ct-label-" + i)
			.attr("transform", 
				  "translate(" + (+timeScale(d.x) + translateX) + "," 
							   + (+ctScale(d.curr_y) + margin.ctLabelY)+ ")");
		// Add text	
		var ctLabelCt = ctLabel.append("text")
			.attr("text-anchor", textAnchor)
			.text(text);
	}

	function updateBarCtLabel(currLabel) {
			var barIdx   = parseInt( currLabel.attr("id").split("-").slice(-1) ),
				barBin   = d3.wepay._timelineCts[barIdx],
				newText  = barBin.curr_y == 1 ? barBin.curr_y + " trasaction" :
												barBin.curr_y + " trasactions";

			addBarCtLabel(timelineHist, barBin, barIdx);
			console.log("check ct label update");
			// // is this necessary?
			// var start = label.attr("transform");
			// label.select("text")
			// 	.attr("class", "bar-ct-label")
			// 	.attr("transform", label.attr("transform")) // 
			// 	.text(new_text);
	}

	return timeline; // return timeline closure
}






	



	



