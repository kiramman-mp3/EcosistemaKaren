const { ValidationException } = require('../../../domain/exceptions/DomainExceptions');

function copyParsed(target, parsed) {
  for (const key of Object.keys(target || {})) delete target[key];
  Object.assign(target, parsed);
}

function formatIssues(issues) {
  return issues.slice(0, 10).map(issue => ({
    field: issue.path.length ? issue.path.join('.') : 'request',
    message: issue.message
  }));
}

function validateRequest(contract) {
  return (req, res, next) => {
    for (const part of ['params', 'query', 'body']) {
      const schema = contract[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part] || {});
      if (!result.success) {
        const error = new ValidationException('La solicitud contiene datos inválidos.');
        error.details = formatIssues(result.error.issues);
        return next(error);
      }
      if (part === 'body') req.body = result.data;
      else copyParsed(req[part], result.data);
    }
    return next();
  };
}

module.exports = validateRequest;
