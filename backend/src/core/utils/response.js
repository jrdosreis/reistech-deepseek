function responseSuccess(data, message = null) {
  return {
    success: true,
    data,
    ...(message && { message }),
  };
}

function responseError(error, code = 'INTERNAL_ERROR', data = null) {
  return {
    success: false,
    error: typeof error === 'string' ? error : error.message || 'Erro desconhecido',
    code,
    ...(data && { data }),
  };
}

module.exports = {
  responseSuccess,
  responseError,
};