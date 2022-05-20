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

var createError = require('http-errors');
var express = require('express');
var router = express.Router();
const axios = require('axios');

/* GET home page with query. */
router.get('/:objectid', function(req, res, next) {

  const objectid = req.params.objectid;  
  if(!objectid)
  {
    next(createError(404));    
  }
  else
  {
    // Query API:
    var queryURL = req.protocol+"://"+req.headers.host + '/api/cj_list/' + objectid;

    console.log(queryURL);

    axios
    .get(queryURL)
    .then(response => {
      console.log(`statusCode: ${response.status}`);
      res.render('index', { title: 'Conjunction Service', objectid: objectid, conjuntionList: response.data });
    })
    .catch(error => {
      console.error(error);
      next(createError(404));    
    });
  }
});

module.exports = router;