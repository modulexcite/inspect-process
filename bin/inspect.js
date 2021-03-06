#!/usr/bin/env node
'use strict';

/* -----------------------------------------------------------------------------
 * dependencies
 * ---------------------------------------------------------------------------*/

// 3rd party
const _ = require('lodash/fp');
const yargs = require('yargs');
const v8flags = require('v8flags');

// lib
const inspect = require('../lib/index');


/* -----------------------------------------------------------------------------
 * usage
 * ---------------------------------------------------------------------------*/

const inspectCliOptions = {
  'debug-exception': {
    type: 'boolean',
    description: 'Pause debuuger on exceptions.'
  },
  'log-level': {
    type: 'string',
    description: 'The level to display logs at.',
    choices: ['silly', 'verbose', 'info'],
    default: 'info'
  }
};

// early parse in order to show inspect specific help options
yargs.options(inspectCliOptions)
  .usage('\nUsage:\ninspect [inspect options] [node options] [v8 options] [script] [arguments]')
  .version()
  .help()
  .argv;


/* -----------------------------------------------------------------------------
 * inspect
 * ---------------------------------------------------------------------------*/

v8flags((err, result) => {
  if (err) {
    throw new Error(err);
  }

  const v8Flags = _.map((flag) => flag.substring(2))(result);
  const nodeFlags = ['preserve-symlinks', 'zero-fill-buffers', 'prof-process',
    'track-heap-objects', 'trace-sync-io', 'trace-warnings', 'no-warnings',
    'throw-deprecation', 'trace-deprecation', 'no-deprecation', 'interactive',
    'enable-fips', 'force-fips', 'debug-brk'];
  const nodeStringOptions = ['require', 'eval', 'print', 'icu-data-dir=dir',
  'openssl-config=path', 'tls-cipher-list=val'];
  const nodeNumberOptions = ['v8-pool-size'];

  const parsed = yargs
    .boolean(v8Flags)
    .boolean(nodeFlags)
    .string(nodeStringOptions)
    .number(nodeNumberOptions)
    .argv;

  const args = process.argv.slice(2);
  const cmd = parsed._[0];
  const cmdIndex = args.indexOf(cmd);
  const processArgs = args.slice(0, cmdIndex);

  // all keys after the cmd should be considered childArgs
  const childArgs = args.slice(cmdIndex + 1);
  const childFlags = _.map((arg) => arg.split('=')[0])(childArgs);

  // inspectOptions are just picked from our parsed args. We pass "options"
  // rather than args because we are not proxying the args to the future
  // child_process
  const inspectKeys = _.keys(inspectCliOptions);
  const inspectFlags = _.map((key) => '--' + key)(inspectKeys);
  const inspectOptions = _.compose(_.omitBy((val, key) => {
    return childFlags.includes('--' + key)
  }), _.pick(inspectKeys))(parsed);

  // node args are simply processArgs that are not inspectArgs
  const nodeArgs = _.remove((arg) => {
    return inspectFlags.includes(arg.split('=')[0]);
  })(processArgs);

  inspect(cmd, {
      nodeArgs: nodeArgs,
      childArgs: childArgs,
      inspectOptions: inspectOptions
    })
    .then(() => process.exit())
    .catch(() => process.exit(1));
});
