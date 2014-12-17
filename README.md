# Open Smart Environment framework

Lightweight and extensible framework for development and rapid
prototyping of modern applications based on Node.js and HTML5.

The framework is created as a base for an OSE application that
manages the physical and virtual environment that a user lives
in. It brings the ability to easily monitor and control the
environment, and to automate tasks.

## Features
- Multi-instance architecture
- Transparent network communication via WebSockets
- Near real-time synchronization
- Code sharing between Node.js and web browsers
- Partitioned data model
- Extensible via npm packages

## Status
- Pre-alpha stage (insecure and buggy)
- Unstable API
- Gaps in the documentation
- No test suite

This is not yet a piece of download-and-use software. Its important
to understand the basic principles covered by this documentation.

Use of this software is currently recommended only for users that
wish participate in the development process (see Contributions).

TODO: Make contribution a link

## Getting started
To get started with OSE, refer to the [ose-bundle] package and
[Media player example application].

## Platforms

We are developing the OSE framework on the following platforms and
browsers:
- Node.js (>0.10) running on Debian Jessie and Raspbian
- recent versions of Firefox
- recent versions of Chromium/Chrome

It, however, probably also runs on other recent Linux
distributions.

## Components
Open Smart Environment framework consists of the following components:
- Data model
- HTTP server
- Peers
- Sockets and links
- Logging and error handling
- Plugins
- Classes and singletons

### Data model
The data model of the framework is designed so that individual
instances of OSE hold subsets of the data and together create a
single whole.

Data partitions are called [shards]. Basic data units contained by
[shards] are called [entries].

Each [entry] is of a certain [kind]. [Kinds] define the properties
and behaviour of [entries]. Kinds are namespaced using [scopes].

Each [shard] belongs to a [space] that act as the shard's
namespace. Each shard is tied to [scope] and can contain only
entries of kinds from that [scope].

Kind hierarchy:
* scope
  * kind

Data partitioning hierarchy:
* space
  * shard
    * entry

Example:

The `reading.light` is an entry of the kind `light`, the `light`
kind belongs to the `control` scope, and the `reading.light` entry
is saved in the shard `living.room`, which belongs to the space
`my.house`.

Read more about [Data model] ...


### HTTP server
This component provides an HTTP server for OSE. It responds to HTTP
requests and provides data needed to run OSE instance in the
browser. Each OSE package that needs to run in the browser creates
one `ose/lib/http/content` class instance and defines which files
will be provided to the browser.

It also handles incoming WebSocket requests from other OSE
instances and relays them to the [peers component].

Read more about [HTTP server] ...


### Peers
The system, which is based on the OSE framework, consist of one or
more configured instances, called OSE instances. An OSE instance is
identified by a unique `name` an can run in Node.js or in a web
browser.

From the point of view of an OSE instance, a peer is another OSE
instance. Two peers can communicate with each other using the
WebSocket protocol. Peers can be accessed directly, when a
WebSocket channel exists, or indirectly, by using another peer as a
gateway.

This component allows the following communication between OSE
instances:

- Obtaining [entries] and views of entries.
- Synchronization of [states of entries] in near real-time.
- Sending of commands to entries.
- Establishing transparent, asynchronous bidirectional [links]
  between entries.

Read more about [Peers] ...


### Sockets and links
The framework makes it possible to easily create links between
`entries` to allow communication regardless of whether it is
realized within one OSE instance or transparently across multiple
OSE instances. A link is a virtual bidirectional communication
channel between two sockets. Link cannot exist without an active
[peer-to-peer] connection channel between sockets. When some
WebSocket channel is closed, an `error` handler is called on both
ends of links using such channel and links are closed.

Each socket is an object with handlers. A socket is either a client
socket or a response socket. To establish a link, a client socket
must first be created. The client socket must then be delivered to
the master entry's handler. This handler must then create a
corresponding response socket and open a link.  After the link is
established, the client and response sides become equal.

Read more about [Sockets and links] ...


### Logging and error handling
To log errors and messages, each module should at first create `M.log` instance by calling
`Ose.logger(context)`. The context is an identifier of the logging
namespace. `Ose.logger()` either returns an existing `M.log`
instance for the namespace or creates a new one. Once created, the logger can be used to log messages.

Error handling tries to adhere to the production practices outlined
by Joyent ([Error Handling in
Node.js](http://www.joyent.com/developers/node/design/errors)).

Read more about [Logging and error handling] ...


### Plugins
To run, each `OSE instance` requires a main configuration object
(JavaScript object or JSON). Each main configuration object
property contains configuration data for one plugin. A plugin can
be a class, singleton or module.

All plugins are registered to the `Ose.plugins` singleton. This
singleton prepares configurations for the OSE browser instances as
part of the response to HTTP requests for `index.html`.

During `OSE instance` startup, the following steps are carried out:
1. Setup of the framework
2. Preparation of plugins
3. Configuration of plugins
4. Asynchronous processing of plugin dependencies

After all dependencies are processed, the `initialized` event is
emitted by `Ose.plugins`.

Read more about [Plugins] ...


### Classes and singletons
This component facilitates the usage of classes or singletons with
simple code sharing and runtime specific behaviour by the browser
and Node.js environments. This makes it possible to use
prototypal inheritance to create classes and singletons and to mix
in modules into class prototypes and singletons.

Read more about [Classes and singletons] ...


## Modules
Open Smart Environment framework consists of the following modules:
- OSE browser
- CLI interface module
- Counter
- OSE core
- OSE node
- OSE content

### OSE browser
This script contains the OSE framework initialization in the browser. It must be sourced before any other OSE module that is using `window.ose()`.

The following steps are taken in this script:
- The limited CommonJS require() behaviour is prepared. Every module, provided by the backend to the browser, is wrapped to `window.ose()` method call.
- The `run` method on `document.onload` event is registered.
- After the document is ready, `ose.setup()` is called to prepare OSE framework.
- Finally [plugins] are configured with configuration from module `ose/config`.

Module [OSE browser] reference ... 

### CLI interface module
This module provides a CLI interface module for OSE Node.js
instances. Commands can be entered to readline interface or run as
a script from a configuration file.

Interactive example:
    > sleep 10000
    > space klinec.snasel.net
    > shard d1
    > entry kitchen.heater
    > command power 0.23
    > entry living.heater
    > info
    > detail

Configuration file example:

    exports.cli = {
      type: 'ose/lib/cli',
      script: TODO
        'wait 10000',
        'space klinec.snasel.net',
        'shard d1',
        'entry kitchen.heater',
        'command power 0.23',
        'entry living.light',
        'command switch "on"',
        'info',
        'detail'
    }

Module [CLI interface module] reference ... 

### Counter
Counters are used for multiple asynchronous operations with one final callback.

Module [Counter] reference ... 

### OSE core
Most modules use the `OSE core` singleton by calling `var Ose = require('ose')`.

Module [OSE core] reference ... 

### OSE node
This module contains the OSE framework initialization in the Node.js.

Module [OSE node] reference ... 

### OSE content
Provides files of OSE framework package to the browser.

Module [OSE content] reference ... 

## Contributions
To get started contributing or coding, it is good to read about the
two main npm packages [ose] and [ose-bb].

This software is in the pre-alpha stage. At the moment, it is
premature to file bugs. Input is, however, much welcome in the form
of ideas, comments and general suggestions.  Feel free to contact
us via
[github.com/opensmartenvironment](https://github.com/opensmartenvironment).

## License
This software is licensed under the terms of the [GNU GPL version
3](../LICENCE) or later
