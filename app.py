import os, re
from flask import Flask, jsonify, render_template, request
from flaskext.mysql import MySQL
from helpers import lookup
# delete later
import json

# Configure application
app = Flask(__name__)
mysql = MySQL()


# Configure MySQL library to use MySQL database
app.config['MYSQL_DATABASE_USER'] = 'root'
app.config['MYSQL_DATABASE_PASSWORD'] = 'Lyf20000520!'
app.config['MYSQL_DATABASE_DB'] = 'cities'
app.config['MYSQL_DATABASE_HOST'] = 'localhost'
mysql.init_app(app)

# Ensure responses aren't cached
@app.after_request
def after_request(response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Expires"] = 0
    response.headers["Pragma"] = "no-cache"
    return response

@app.route("/")
def index():
    """Render map"""
    #if not (os.environ.get("API_KEY")):
    #    raise RuntimeError("API_KEY not set")
    return render_template("index.html", key=os.environ.get("API_KEY","API_KEY not set"))


@app.route("/search")
def search():
    """Search for places that match query"""

    # select cities that match input%
    q = request.args.get("q") + "%"
    cursor = mysql.connect().cursor()
    cursor.execute("""SELECT country_code, place_name, admin_code1, admin_name1,latitude, longitude
                      FROM ca_cities
                      WHERE place_name LIKE %s""",
                      (q))
    rows = cursor.fetchall()
    json_data=[]
    content = {}
    for result in rows:
        content = {'country_code':result[0],'place_name':result[1],'admin_code1':result[2], \
            'admin_name1':result[3], 'latitude':result[4], 'longitude':result[5]}
        json_data.append(content)
        content = {}
    print(json_data)
    return jsonify(json_data)

@app.route("/articles")
def articles():
    """Look up articles for geo"""

    # call helper function and return the first five in the list
    results = lookup(request.args.get("geo"))
    j = jsonify(results[:5])
    print(json.dumps(j, indent=4, sort_key=True))
    return j


@app.route("/update")
def update():
    """Find up to 10 places within view"""

    # Ensure parameters are present
    if not request.args.get("sw"):
        raise RuntimeError("missing sw")
    if not request.args.get("ne"):
        raise RuntimeError("missing ne")

    # Ensure parameters are in lat,lng format
    if not re.search("^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$", request.args.get("sw")):
        raise RuntimeError("invalid sw")
    if not re.search("^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$", request.args.get("ne")):
        raise RuntimeError("invalid ne")

    # Explode southwest corner into two variables
    sw_lat, sw_lng = map(float, request.args.get("sw").split(","))

    # Explode northeast corner into two variables
    ne_lat, ne_lng = map(float, request.args.get("ne").split(","))

    cursor = mysql.connect().cursor()

    # Find 10 cities within view, pseudorandomly chosen if more within view
    if sw_lng <= ne_lng:

        # Doesn't cross the antimeridian
        cursor.execute("""SELECT country_code, place_name, admin_code1, admin_name1,latitude, longitude
                          FROM ca_cities
                          WHERE %s <= latitude AND latitude <= %s AND (%s <= longitude AND longitude <= %s)
                          GROUP BY country_code, place_name, admin_code1
                          ORDER BY RAND()
                          LIMIT 10""",
                          (sw_lat, ne_lat, sw_lng, ne_lng))
        rows = cursor.fetchall()
        cursor.close()
    else:

        # Crosses the antimeridian
        cursor.execute("""SELECT country_code, place_name, admin_code1, admin_name1,latitude, longitude 
                          FROM ca_cities
                          WHERE :sw_lat <= latitude AND latitude <= :ne_lat AND (:sw_lng <= longitude OR longitude <= :ne_lng)
                          GROUP BY country_code, place_name, admin_code1
                          ORDER BY RAND()
                          LIMIT 10""",
                          sw_lat=sw_lat, ne_lat=ne_lat, sw_lng=sw_lng, ne_lng=ne_lng)
        rows = cursor.fetchall()
        cursor.close()
    # Output places as JSON
    return jsonify(rows)

if __name__ == '__main__':
    # This is used when running locally only. When deploying to Google App
    # Engine, a webserver process such as Gunicorn will serve the app. This
    # can be configured by adding an `entrypoint` to app.yaml.
    app.run(host='127.0.0.1', port=8080, debug=True)