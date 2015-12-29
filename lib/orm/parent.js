'use strict';

var O = require('ose').module(module);

// Public {{{1
exports.array = function(name) {  // {{{2
  return O.new('./array')(this, name);
};

exports.boolean = function(name) {  // {{{2
  return O.new('./boolean')(this, name).params({
    decimal: 0,
  });
};

exports.entry = function(name) {  // {{{2
  return O.new('./entry')(this, name);
};

exports.integer = function(name) {  // {{{2
  return O.new('./number')(this, name).params({
    decimal: 0,
  });
};

exports.interval = function(name) {  // {{{2
  return O.new('./millitime')(this, name);
};

exports.list = function(name) {  // {{{2
  return O.new('./list')(this, name);
};

exports.map = function(name) {  // {{{2
  return O.new('./map')(this, name);
};

exports.millitime = function(name) {  // {{{2
  return O.new('./millitime')(this, name);
};

exports.number = function(name) {  // {{{2
  return O.new('./number')(this, name);
};

exports.object = function(name) {  // {{{2
  return O.new('./object')(this, name);
};

exports.query = function(name) {  // {{{2
  return O.new('./query')(this, name);
};

exports.shard = function(name) {  // {{{2
  return O.new('./shard')(this, name);
};

exports.text = function(name) {  // {{{2
  return O.new('./text')(this, name);
};

