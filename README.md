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
wish participate in the development process, see
[Contributions](#contributions).

## Getting started
To get started with OSE, refer to the [ose-bundle](http://opensmartenvironment.github.io/doc/modules/bundle.html) package and
[Media player example application](http://opensmartenvironment.github.io/doc/modules/bundle.media.html). You can read the entire OSE
documentation [here]( http://opensmartenvironment.github.io/doc).

## <a name="platforms"></a>Platforms

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

Data partitions are called [shards](http://opensmartenvironment.github.io/doc/classes/ose.lib.shard.html). Basic data units contained by
[shards](http://opensmartenvironment.github.io/doc/classes/ose.lib.shard.html) are called [entries](http://opensmartenvironment.github.io/doc/classes/ose.lib.entry.html).

Each [entry](http://opensmartenvironment.github.io/doc/classes/ose.lib.entry.html) is of a certain [kind](http://opensmartenvironment.github.io/doc/classes/ose.lib.kind.html). [Kinds](http://opensmartenvironment.github.io/doc/classes/ose.lib.kind.html) define the properties
and behaviour of [entries](http://opensmartenvironment.github.io/doc/classes/ose.lib.entry.html). Kinds are namespaced using [scopes](http://opensmartenvironment.github.io/doc/classes/ose.lib.scope.html).

Each [shard](http://opensmartenvironment.github.io/doc/classes/ose.lib.shard.html) belongs to a [space](http://opensmartenvironment.github.io/doc/classes/ose.lib.space.html) that act as the shard's
namespace. Each shard is tied to [scope](http://opensmartenvironment.github.io/doc/classes/ose.lib.scope.html) and can contain only
entries of kinds from that [scope](http://opensmartenvironment.github.io/doc/classes/ose.lib.scope.html).

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

Read more about [Data model](http://opensmartenvironment.github.io/doc/modules/ose.data.html) ...


### HTTP server
This component provides an HTTP server for OSE. It responds to HTTP
requests and provides data needed to run OSE instance in the
browser. Each OSE package that needs to run in the browser creates
one `ose/lib/http/content` class instance and defines which files
will be provided to the browser.

It also handles incoming WebSocket requests from other OSE
instances and relays them to the [peers component](http://opensmartenvironment.github.io/doc/modules/ose.peer.html).

Read more about [HTTP server](http://opensmartenvironment.github.io/doc/modules/ose.http.html) ...


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

- Obtaining [entries](http://opensmartenvironment.github.io/doc/classes/ose.lib.entry.html) and views of entries.
- Synchronization of [states of entries](http://opensmartenvironment.github.io/doc/classes/ose.lib.entry.html) in near real-time.
- Sending of commands to entries.
- Establishing transparent, asynchronous bidirectional [links](http://opensmartenvironment.github.io/doc/modules/ose.link.html)
  between entries.

Read more about [Peers](http://opensmartenvironment.github.io/doc/modules/ose.peer.html) ...


### Sockets and links
The framework makes it possible to easily create links between
`entries` to allow communication regardless of whether it is
realized within one OSE instance or transparently across multiple
OSE instances. A link is a virtual bidirectional communication
channel between two sockets. Link cannot exist without an active
[peer-to-peer](http://opensmartenvironment.github.io/doc/modules/ose.peer.html) connection channel between sockets. When some
WebSocket channel is closed, an `error` handler is called on both
ends of links using such channel and links are closed.

Each socket is an object with handlers. A socket is either a client
socket or a response socket. To establish a link, a client socket
must first be created. The client socket must then be delivered to
the master entry's handler. This handler must then create a
corresponding response socket and open a link.  After the link is
established, the client and response sides become equal.

Read more about [Sockets and links](http://opensmartenvironment.github.io/doc/modules/ose.link.html) ...


### Logging and error handling
To log errors and messages, each module should at first create `M.log` instance by calling
`Ose.logger(context)`. The context is an identifier of the logging
namespace. `Ose.logger()` either returns an existing `M.log`
instance for the namespace or creates a new one. Once created, the logger can be used to log messages.

Error handling tries to adhere to the production practices outlined
by Joyent ([Error Handling in
Node.js](http://www.joyent.com/developers/node/design/errors)).

Read more about [Logging and error handling](http://opensmartenvironment.github.io/doc/modules/ose.logger.html) ...


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

Read more about [Plugins](http://opensmartenvironment.github.io/doc/modules/ose.plugin.html) ...


### Classes and singletons
This component facilitates the usage of classes or singletons with
simple code sharing and runtime specific behaviour by the browser
and Node.js environments. This makes it possible to use
prototypal inheritance to create classes and singletons and to mix
in modules into class prototypes and singletons.

Read more about [Classes and singletons](http://opensmartenvironment.github.io/doc/modules/ose.wrap.html) ...


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
- Finally [plugins](http://opensmartenvironment.github.io/doc/modules/ose.plugin.html) are configured with configuration from module `ose/config`.

Module [OSE browser](http://opensmartenvironment.github.io/doc/classes/ose.lib.browser.html) reference ... 

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

Module [CLI interface module](http://opensmartenvironment.github.io/doc/classes/ose.lib.cli.html) reference ... 

### Counter
Counters are used for multiple asynchronous operations with one final callback.

Module [Counter](http://opensmartenvironment.github.io/doc/classes/ose.lib.counter.html) reference ... 

### OSE core
Most modules use the `OSE core` singleton by calling `var Ose = require('ose')`.

Module [OSE core](http://opensmartenvironment.github.io/doc/classes/ose.core.html) reference ... 

### OSE node
This module contains the OSE framework initialization in the Node.js.

Module [OSE node](http://opensmartenvironment.github.io/doc/classes/ose.lib.node.html) reference ... 

### OSE content
Provides files of OSE framework package to the browser.

Module [OSE content](http://opensmartenvironment.github.io/doc/classes/ose.content.html) reference ... 

## <a name="contributions"></a>Contributions
To get started contributing or coding, it is good to read about the
two main npm packages [ose](http://opensmartenvironment.github.io/doc/modules/ose.html) and [ose-bb](http://opensmartenvironment.github.io/doc/modules/bb.html).

This software is in the pre-alpha stage. At the moment, it is
premature to file bugs. Input is, however, much welcome in the form
of ideas, comments and general suggestions.  Feel free to contact
us via
[github.com/opensmartenvironment](https://github.com/opensmartenvironment).

## Licence
This software is released under the terms of the [GNU General
Public License v3.0](http://www.gnu.org/copyleft/gpl.html) or
later.
