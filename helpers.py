import urllib.parse
import feedparser
from newsapi.newsapi_client import NewsApiClient

def lookup(geo):
    """Look up articles for geo"""

    newsapi = NewsApiClient(api_key='5d2ceadf7be44440bc1962f85c6f1c0e')

    # get everything in this location sorted by publish time in a dictionary
    all = newsapi.get_everything(q=geo, 
                                 language='en',
                                 sources='cbc-news',
                                 domains='cbc.ca'
                                 )
    # If no items in feed, get feed from Onion
    if not all:
        feed = feedparser.parse("http://www.theonion.com/feeds/rss")
        return feed[:5]
    sources = all.get('articles')
    result=[]
    row = {}
    for news in sources:
        row = {'title':news.get('title'), 'link': news.get('url')}
        result.append(row)
        row={}
    return result
