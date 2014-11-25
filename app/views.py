info="""Flask view mapping for the WePay transactions visualization app.
     """

__author__ = "christopher c williams"
__date__   = "2014-11" 

from app.static.python import parse_transactions as TxnsPrsr
from flask import render_template, request, jsonify
from app import app
import pandas as pd 
import glob
import os

# The base directory for all txns files to be served
DATA_DIR     = "%s/static/data/txns" % os.path.dirname( os.path.realpath(__file__) )
REL_DATA_DIR = "../static/data/txns"
#..............................................................................
# Helper functions for views
def get_datafile(data_id):
    """
    """
    data_relpath = ""
    
    # first try to find a json version of the file (already parsed)
    if os.path.isfile("%s/%s.json" % (DATA_DIR, data_id)):
        data_relpath = "%s/%s.json" % (REL_DATA_DIR, data_id) 

    # next try to find a .csv version of the file (not yet parsed)
    elif os.path.isfile("%s/%s.csv" % (DATA_DIR, data_id)):
        pass

    else: # no luck
        print "%s/%s.json nor *.csv not found" % (DATA_DIR, data_id)
    
    return data_relpath

def get_mostrecent_file(directory, pattern):
    """Returns the filename of the most recently updated file in the passed
       directory
    """
    # Find all *.json files in the data directory, sort by most recently modified
    files = [ f for f in glob.glob(os.path.join(DATA_DIR, pattern)) ]
    files.sort(key=os.path.getmtime)

    if files:
        mostrecent_file = os.path.split( files[-1] )[1] # -1 = most recent
        return mostrecent_file
    else: 
        return "" # no match


#..............................................................................
# Views
@app.route('/')
@app.route('/wepay')
def wepay(methods=["GET"]):
    """Base view that serves the WePay HTML page. Handles a GET request and
       expects a reques 'id' parameter which serves as an identifier for the
       data to be loaded and served with the page. 

       Subsequent requests for data (e.g., in the form of XHR/AJAX requests)
       are expected to be made to the /get_data view.
    """ 
    title    = "WePay transaction visualization"

    data_id      = request.args.get("id")
    data_relpath = get_datafile(data_id)

    return render_template("wepay.html", title=title, datafile=data_relpath)

@app.route('/update_data')
def update_data(methods=["GET"]):
    """Handles requests for more data. Expects a lastfile parameter which
       enables the handler to find a more recent file if it exists in the
       directory, or to return the same file again for looping.
    """
    old_relpath     = new_relpath = request.args.get("prev_datafile")
    old_file        = os.path.split( old_relpath )[1] # remove path
    mostrecent_file = get_mostrecent_file(DATA_DIR,  "*.json")

    if old_file != mostrecent_file: 
        new_relpath = "%s/%s" % (REL_DATA_DIR, mostrecent_file)

    return new_relpath

