const success = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({ status: 'success', message, data });
};

const created = (res, data, message = 'Created') => {
  return success(res, data, message, 201);
};

const error = (
  res,
  message = 'Internal Server Error',
  statusCode = 500,
  details = null,
) => {
  const body = { status: 'error', message };
  if (details) body.details = details;
  return res.status(statusCode).json(body);
};

export { success, created, error };
