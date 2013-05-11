'use strict';

var wrench = require('wrench');
var express = require('express');
var app = express();


wrench.copyDirSyncRecursive('./src', './test/lb', {
  forceDelete: true,
  excludeHiddenUnix: false,
  preserveFiles: true,
  inflateSymlinks: false
});


app.use(express.static(__dirname + '/test'));

app.get('/', function(req, res) {
  res.render('index.html');
});


app.listen(3000);
