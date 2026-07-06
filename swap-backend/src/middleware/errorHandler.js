const errorHandler = (err, req, res, next) => {
  console.error(err);

  const response = {
    success: false,
    error: err.message || "Internal server error",
  };

  if (err.code) response.code = err.code;
  if (err.category) response.category = err.category;
  if (typeof err.retryable === "boolean") response.retryable = err.retryable;

  if (err.details?.resCode) {
    response.provider = {
      resCode: err.details.resCode,
      resMsg: err.details.resMsg,
      resMsgEn: err.details.resMsgEn,
    };
  }

  res.status(err.status || 500).json(response);
};

module.exports = errorHandler;
