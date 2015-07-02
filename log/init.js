winston = require('winston');
container = new winston.Container();
winston.loggers.add('debug', {
  console: {
    level: 'debug',
    colorize: true,
    label: 'debug'
  },
  file: {
    filename:  process.cwd() + '/log/debug.log',
    level: 'debug'
  }
})
winston.loggers.add('info',{
  console: {
    level: 'info',
    colorize: true,
    label: 'info'
  },
  file: {
    filename:  process.cwd() + '/log/info.log'
  }
})
winston.loggers.add('error',{
  console: {
    level: 'error',
    colorize: true,
    label: 'error'
  },
  file: {
    filename:  process.cwd() + '/log/error.log'
  }
});
logger = {
  debug:winston.loggers.get('debug').debug,
  info:winston.loggers.get('info').info,
  error:winston.loggers.get('error').error
};
