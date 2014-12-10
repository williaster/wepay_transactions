/*
 * Transaction vis utility module. 
 * @author chris c williams
 * @date   2014-12
 *
 * Utility functions added to the d3.wepay.util namespace. This module includes
 * functions that parse data, fetching and/or updating data through xhr requests, 
 * and controller-like tasks for the visualization. It should be included in all 
 * transaction visualizations.
 */

d3.wepay = d3.wepay || {}; 	// declare namespace if it doesn't exist 
d3.wepay.util = {}; 		// util methods here

/*
 * Returns a colorMaker function used for arc colors. The returned object
 * behaves exactly like a d3.scale.color() scale: it is a function that takes as 
 * input an index and returns a color which corresponds to that index. If the 
 * index exceeds the valid range of colors, indices/colors are recycled
 *
 * Simply redefine the colors array to determine the possible color outputs
 */
d3.wepay.util.colorMaker = function() {
	var colors = [ "#2eb135" , "#195825", "#268438", "#75bf81", "#a7d3af", // greens 
					"#4991dc", "#25496e", "#376da5", "#6cafdd",  // blues
					"#343b45", "#52565b", "#697277", "#828a8f" ] // greys

	return d3.scale.ordinal().range(colors.sort()); // sort to randomize order
													// will get least red vals first ...
}

/*
 * Formats a number with commas, better performance than n.toLocaleString(), 
 * although is less intelligent. not tested with decimals.
 * source: http://stackoverflow.com/a/2901298
 */
d3.wepay.util.numWithCommas = function(n) { 
	return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/*
 * Requests new data, parses it, and calls update_transaction_data
 * Upon completion of data parsing, also executese a callback function
 * if it is provided.
 */
d3.wepay.util.getData = function(dataFile, callback) {
	d3.json(dataFile, function(error, newTxns) {
		if (error) { return console.log(error); }
		
		d3.wepay.util.parseTxns(newTxns); 
		d3.wepay.util.updateTxnData(newTxns);

		if (callback) callback(); // signals done if used with queue()
	});
}

/*
 * Updates data by simply looping with the current data if the loop
 * variable is true. Else, issues a xhr request to the server to update 
 * data. Currently this is done by passing the previous datafile.
 */ 
d3.wepay.util.updateData = function(prevDatafile) {
	if (d3.wepay._loop) { // just loop
		d3.wepay.util.updateTxnData(d3.wepay._txns); 
		d3.wepay._map.start();

	} else { // otherwise request new data file and fetch new data
		var url = d3.wepay._callbackDomain + "?prev_datafile=" + prevDatafile;

		d3.xhr(url, function(error, resp) {
			if (error) { 
				d3.wepay.util.clearVisualization();
				return console.log(error);
			}
			d3.wepay._dataFile = resp.response;
			d3.wepay.util.getData( resp.response, d3.wepay._map.start );
		});
	}
}

/*
 * Adds a LineString geoJSON feature to each transaction using to/from coords 
 * this is used to draw paths on the globe (not sky). Converts time to an explicit
 * Date object (from ms since epoch)
 */
d3.wepay.util.parseTxns = function(txns) {
	txns.forEach(function(txn){
		txn["time"]     = new Date(txn["time"]);
		txn["type"]     = "Feature";
		txn["geometry"] = {
			"type": "LineString",
			"coordinates": [ eval(txn.from_coord), eval(txn.to_coord) ]
		}
	});
}

/* 
 * Sets the wepay._txns and wepay._timelineCts variables
 */
d3.wepay.util.updateTxnData = function(newTxns) {

	var oldTxns    = d3.wepay._txns.length ? d3.wepay._txns : undefined,
		nNewTxns   = newTxns.length,
		nOldTxns   = oldTxns ? 
				    (oldTxns ? oldTxns.totalTxns : oldTxns.length) : 0,
		minNewTxns = newTxns[0].time.getTime(),
		maxNewTxns = newTxns[newTxns.length-1].time.getTime(),
		minOldTxns = oldTxns ? oldTxns[0].time.getTime() : undefined,
		maxOldTxns = oldTxns ? oldTxns[oldTxns.length - 1].time.getTime() : undefined;

	// Case 0: tranactions is empty, so new_txns are the first txns
	if (!oldTxns) {
		if (newTxns.length > d3.wepay._maxTransactions) {
			newTxns = newTxns.slice(-d3.wepay._maxTransactions);
		}
		d3.wepay.util.initVisualization(newTxns);
	}
	// Case 1: If the start and end of new_txns match the current transactions,
	// 		   just loop with the same data.
	else if (minNewTxns == minOldTxns && maxNewTxns == maxOldTxns 
			 && nNewTxns == nOldTxns) {
		d3.wepay.util.resetVisualization(0); // param = fillToIdx
	}
	// Case 2: If all new_txns come after the current txns, append them to 
	// 		   current txns & slice off old txns leaving as many transactions 
	// 		   as possible without exceeding max_transactions 
	else if (minNewTxns >= maxOldTxns && maxNewTxns > maxOldTxns) {

		var nOldKeep   = d3.wepay._maxTransactions - newTxns.length,
			oldTxns    = nOldKeep > 0 ? oldTxns.slice(-nOldKeep) : [],
			newTxns    = newTxns.slice(-d3.wepay._maxTransactions),
			concatTxns = oldTxns.concat(newTxns),
			nTotalTxns = concatTxns.length;

		// Here we update timeline_cts using all data because both new and old data
		// are displayed in the histogram; we then update transactions to include
		// only the new transactions because the old histogram counts will be filled
		// and we want arcs to feed from only the new point in time/new values

		var fillToIdx = 0;
		if (d3.wepay._timeline) {
			d3.wepay._txns = concatTxns;
			d3.wepay._timeline.updateTimelineCts(1000); // param = ms duration of change

			fillToIdx = d3.wepay._timeline.getFillToIdx(oldTxns);
			d3.wepay._timeline.initTimeline()
		}

		d3.wepay._txns = newTxns; 
		d3.wepay._txns.totalTxns = nTotalTxns;
		d3.wepay.util.resetVisualization(fillToIdx);

	// Case 3: None of the above, just start with new data
	} else { 
		if (newTxns.length > d3.wepay._maxTransactions) {
			newTxns = newTxns.slice(-d3.wepay._maxTransactions);
		}
		d3.wepay.util.initVisualization(newTxns);
	}
}

/*
 * Initializes the visualization by updating the _txns array to the passed
 * txns array, resetting the time and txn indices, updating the timeline
 * if one exists in the namespace, and building txn groups which are hidden DOM
 * elements with associated txn data.
 */
d3.wepay.util.initVisualization = function(txns) {
	d3.wepay._txns 	  = txns,
	d3.wepay._timeIdx = 0,
 	d3.wepay._txnIdx  = 0;

	if (d3.wepay._timeline) {
		d3.wepay._timeline.updateTimelineCts(500); 
		d3.wepay._timeline.initTimeline();
	}
	d3.wepay._map.buildTxnGroups(txns);
}

/*
 * Resets the visualization for another round of txn visualizations.
 * Clears the timeline if it exists, builds new txn groups for the map, and
 * resets the internal visualization indices. Assumes the _txns variable 
 * is already updated (ie current for next visuaization round).
 */
d3.wepay.util.resetVisualization = function(fillToIdx) {
	if (d3.wepay._timeline) {
		d3.wepay._timeline.resetTimelineCts(fillToIdx);
		d3.wepay._timeline.updateTimeline();
	}

	d3.wepay._timeIdx = 0,
 	d3.wepay._txnIdx  = 0;
	d3.wepay._map.buildTxnGroups(d3.wepay._txns); 
}

/*
 * Clears the visualization by clearing the private _txns and 
 * _timelineCts arrays, then resetting the timeline, if it exists.
 * This effectively removes all data from the visualization and is typically
 * called only in the case of an error.
 */
d3.wepay.util.clearVisualization = function() {
	d3.wepay._txns 		  = [],
	d3.wepay._timelineCts = [];
	
	if (d3.wepay._timeline) d3.wepay._timeline.initTimeline();
}






