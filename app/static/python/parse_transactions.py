#!/Users/christopherwilliams/dotfiles/virtualenvs/.virtualenvs/lighttable/bin/python
info="""Module for parsing a Pandas DataFrame of transactions, or script for 
		reading a *.csv file of transactions from file, to map payer/payee zip 
		codes to longitude, latitude values which d3.js requires. Provides 
		methods for returning parsed data as JSON or writing to file.  
     """

__author__ = "christopher c williams"
__date__   = "2014-11"

import pandas as pd
import os

PATH             = os.path.dirname( os.path.realpath(__file__) )
F_ZIP_TO_LATLONG = "%s/../data/allcountries_zip_to_latlong.txt" % PATH

#..............................................................................
# Helper functions

def get_txn_longlat(df_txns, df_zip_to_latlong):
    """Adds 'payee_coord' and 'payer_coord' cols to the df_txns DataFrame, 
       which correspond to the payee_zip and payer_zip cols. New cols take 
       the form of a string: '[longitude, latitude]'. Note that this is 
       flipped from the normal [lat,long] format, but more closely mirrors 
       [x,y] coordinates and is what d3.js expects. 
    """
    # Payer coords first
    # join to get payer coords
    df = pd.merge(df_txns, df_zip_to_latlong, 
                  left_on=["payer_zip", "payer_country"], 
                  right_on=["zip","country"], how="left")
    
    # remove rows for which lat/long values weren't found
    df.dropna(inplace=True, subset=["lat", "long"]) 
    
    # consolidate to single new column
    df.loc[:,"payer_coord"] = \
        "[" + df["long"].map(str) + "," + df["lat"].map(str) + "]"
    
    # drop join cols in prep for payee coords
    df.drop(["zip", "lat", "long", "country"], axis=1, inplace=True) 
    
    
    # Now payee coords
    df = pd.merge(df, df_zip_to_latlong, 
                  left_on=["payee_zip", "payee_country"], 
                  right_on=["zip","country"], how="left")
    df.dropna(inplace=True, subset=["lat", "long"]) 
    df.loc[:,"payee_coord"] = \
        "[" + df["long"].map(str) + "," + df["lat"].map(str) + "]"
    df.drop(["zip", "lat", "long", "country"], axis=1, inplace=True) 
    
    #print df
    return df

def truncate_CAN_zips(df):
    """Truncates CANADIAN zipcodes in payer_zip or payee_zip
       from 6 to the first 3 characters. MODIFIES the df that is
       passed in.
    """
    payer_trunc = [ zc[:3] for zc \
                    in df.loc[ df.payer_country == "CA", "payer_zip"] ]
    payee_trunc = [ zc[:3] for zc \
                    in df.loc[ df.payee_country == "CA", "payee_zip"] ]
    
    
    df.loc[ df.payee_country == "CA", "payee_zip" ] = payee_trunc
    df.loc[ df.payer_country == "CA", "payer_zip" ] = payer_trunc
    return df

def stringify_zips(df):
    """Converts zip code columns to strings to enable prepending zeros to
       (US) zip codes of the form "0XXXX", to matching with the zip codes 
       in the zip_to_latlong DataFrame. In addition to string coersion,
       prepends a 0 to any zip code that has a length of 4
    """
    prepend_zero = lambda z: str(z) if len(str(z)) != 4 else "0" + str(z)
    
    df.loc[:,"payer_zip"] = df["payer_zip"].map(prepend_zero)
    df.loc[:,"payee_zip"] = df["payee_zip"].map(prepend_zero)
    return df

def set_sec_to_ms(df):
	"""Converts the capture_timestamp from s to ms
	"""
	df.loc[:,"capture_timestamp"] = df["capture_timestamp"]*1000
	return df

def clean_df(df):
    """Removes un-needed columns from df, and siplifies col names to match the 
       json fields the visualization expects.

       Expects df to contain the columns:
       "capture_day", "capture_timestamp", "pr_id", "gross", "payee_coord", "payer_coord"
    """
    df = df.ix[:,["capture_day", "capture_timestamp", "pr_id",
                  "gross", "payee_coord", "payer_coord"]]
    df.columns = \
        ["date", "time", "app_id", "amount", "to_coord", "from_coord"]
    
    df.sort("time", inplace=True)

    return df

def parse_txns(df_txns, df_zip_to_latlong=None):
    """Wrapper function that:
         #1 filters transactions for null payer or payee zip codes
         #2 truncates CANADIAN zipcodes in df_txns to match df_zip_to_latlong
         #3 converts zip codes to strings to prepend 0s to len-4 zip codes
         #4 converts timestamp from s to ms since epoch
         #5 converts zip codes to long/lat values

       Will load df_zip_to_latlong if not passed.
    """
    if not df_zip_to_latlong:
    	df_zip_to_latlong = pd.read_table(F_ZIP_TO_LATLONG, 
    									  names=["country", "zip", "lat", "long"])
    	df_zip_to_latlong = df_zip_to_latlong.drop_duplicates()

    df = df_txns.dropna(subset=["payee_zip", "payee_country", 
                                "payer_zip", "payer_country"]) # need start/end zip
    df = truncate_CAN_zips(df) 
    df = stringify_zips(df)
    df = set_sec_to_ms(df) 
    df = get_txn_longlat(df, df_zip_to_latlong)
    df = clean_df(df)

    return df

def jsonify(df, action="return", outfile=None):
	"""Converts the passed df to record-oriented json, and either writes the
	   result to file (action = "write") or returns it (action = "return").
	"""
	if action == "return":
		return df.to_json(orient="records")
	elif action == "write" and outfile:
		df.to_json(outfile, orient="records")
		return
	else:
		raise Exception("Invalid action or unspecified outfile")

#..............................................................................
# Main, enables running this as a script

def main():
	outfile = "%s_latlong.json" % args.out_base

	print "Parsing transactions from %s ..." % args.csv_file
	df_unparsed  = pd.read_csv(args.csv_file)
	df_parsed 	 = parse_txns( df_unparsed )
	unfilt_txns  = df_unparsed.shape[0]
	filt_txns    = df_parsed.shape[0]

	print "Writing (%i/%i) parsed transactions to %s" % (filt_txns, unfilt_txns, outfile)
	jsonify(df_parsed, action="write", outfile=outfile)

if __name__ == "__main__":
	
	import argparse
	prsr = argparse.ArgumentParser(description=info)
	prsr.add_argument("csv_file", type=str,
					  help="transactions .csv path and filename")
	prsr.add_argument("out_base", type=str, help="output directory + base " \
					  "filename for json output. _latlong.json is appended.")
	args = prsr.parse_args()
	main()