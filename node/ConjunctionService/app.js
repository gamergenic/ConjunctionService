/* Copyright (C) 2022 Chuck Noble <chuck@gamergenic.com>
 * This work is free.  You can redistribute it and /or modify it under the
 * terms of the Do What The Fuck You Want To Public License, Version 2,
 * as published by Sam Hocevar.  See http://www.wtfpl.net/ for more details.
 *
 * This program is free software. It comes without any warranty, to
 * the extent permitted by applicable law. You can redistribute it
 * and/or modify it under the terms of the Do What The Fuck You Want
 * To Public License, Version 2, as published by Sam Hocevar. See
 * http://www.wtfpl.net/ for more details.
 */

// This is a very simple implementation of a web server that displays
// satellite collision alerts by object name.  It has simple caching
// to avoid asking the Space-Track.org for any one object more than once
// per day.
// See the project's GitHub page for more info:
//    https://github.com/gamergenic/ConjunctionServer
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const axios = require('axios');
var fs = require('fs');
var date = new Date();

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);


function querySpaceTrackUrl(objectId)
{
  var uriBase = 'https://www.space-track.org';
  var requestController = '/basicspacedata';
  var requestAction = '/query';

  var predicateValues = '/class/cdm_public/TCA/%3E' + date.toISOString() + '/SAT_1_NAME/~~' + objectId + '/orderby/TCA%20asc/emptyresult/show';

  return uriBase + requestController + requestAction + predicateValues;
}


function querySpaceTrack(objectId, onSuccess, onError)
{
  // NEVER share your spacetrack user / password with anyone!!
  // So, especially don't put them in source code.
  // You can either pass them in as command line args, or better yet get them from
  // environment variables.
  var user = process.env.SPACETRACK_USER;
  var password = process.env.SPACETRACK_PASSWORD;  
  var queryUrl = querySpaceTrackUrl(objectId);

  var postData =
  {
    identity : user,
    password : password,
    query : queryUrl
  }
  
  // Space-Track.Org auth API URL:
  var queryURL = 'https://www.space-track.org/ajaxauth/login';

  // Send the REST API request to Space-Track.org with the user/pwd/query as post data
  axios
  .post(queryURL, postData)
  .then(response => {
    console.log('POST Success: ' + JSON.stringify(response.data).substring(0,255));
    onSuccess(response.data);
  })
  .catch(error => {
    console.log('POST Error: ' + error);
    onError(error);
  });
};


var cachedResults = new Object();
var cacheFile = 'cache/space-track-results-cache.json';
var fileText = fs.readFileSync(cacheFile, 'utf8');

if(fileText)
{
  cachedResults = JSON.parse(fileText);
}

app.get('/api/cj_list/:objectid', (req, res) => {

  var DataCache = new Object();

  const objectid = req.params.objectid;
  console.log('Received cj_list objectid=' + objectid);

  // Check the cache first!
  if(cachedResults[objectid] && Date.now() < cachedResults[objectid].Expires)
  {
    console.log('Cached Data=' + JSON.stringify(cachedResults[objectid].Data).substring(0,255));
    res.json(cachedResults[objectid].Data);
    return;
  }

  querySpaceTrack(
  objectid,
  // If the SpaceTrack call succeeded, cache the data and return it...
  (data) =>
  {
    cachedResults[objectid] = new Object();
    cachedResults[objectid].Expires = Date.now() + 24 * 60 * 60 * 1000;
    cachedResults[objectid].Data = data;
    fs.writeFileSync(cacheFile, JSON.stringify(cachedResults), {encoding: 'utf8'});
    res.json(data);
  },
    // If the call failed, return an empty object
    () => { res.json({}); }
  );
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
