const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');

// @desc    Registrar usuário
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  // Criar usuário
  const user = await User.create({
    name,
    email,
    password,
    role
  });

  // Criar token
  const token = user.getSignedJwtToken();

  // Criar cookie
  sendTokenResponse(user, 200, res);
});

// @desc    Fazer login
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Validar email e senha
  if (!email || !password) {
    return next(new ErrorResponse('Por favor, forneça um e-mail e senha', 400));
  }


  // Verificar usuário
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return next(new ErrorResponse('Credenciais inválidas', 401));
  }

  // Verificar senha
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return next(new ErrorResponse('Credenciais inválidas', 401));
  }

  // Verificar se o e-mail foi confirmado
  if (!user.isEmailConfirmed) {
    return next(new ErrorResponse('Por favor, confirme seu e-mail para fazer login', 401));
  }

  sendTokenResponse(user, 200, res);
});

// @desc    Obter usuário logado
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Esqueci a senha
// @route   POST /api/v1/auth/forgotpassword
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new ErrorResponse('Não há usuário com esse e-mail', 404));
  }

  // Obter token de redefinição
  const resetToken = user.getResetPasswordToken();

  await user.save({ validateBeforeSave: false });

  // Criar URL de redefinição
  const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/resetpassword/${resetToken}`;

  const message = `Você está recebendo este e-mail porque você (ou outra pessoa) solicitou a redefinição da senha. Por favor, faça uma requisição PUT para: \n\n ${resetUrl}`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Redefinição de senha - Token válido por 10 minutos',
      message
    });

    res.status(200).json({ success: true, data: 'E-mail enviado' });
  } catch (err) {
    console.log(err);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save({ validateBeforeSave: false });

    return next(new ErrorResponse('E-mail não pôde ser enviado', 500));
  }
});

// @desc    Redefinir senha
// @route   PUT /api/v1/auth/resetpassword/:resettoken
// @access  Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
  // Obter token hash
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) {
    return next(new ErrorResponse('Token inválido ou expirado', 400));
  }

  // Definir nova senha
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  sendTokenResponse(user, 200, res);
});

// @desc    Atualizar detalhes do usuário
// @route   PUT /api/v1/auth/updatedetails
// @access  Private
exports.updateDetails = asyncHandler(async (req, res, next) => {
  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email
  };

  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Atualizar senha
// @route   PUT /api/v1/auth/updatepassword
// @access  Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');

  // Verificar senha atual
  if (!(await user.matchPassword(req.body.currentPassword))) {
    return next(new ErrorResponse('Senha atual incorreta', 401));
  }

  user.password = req.body.newPassword;
  await user.save();

  sendTokenResponse(user, 200, res);
});

// @desc    Confirmar e-mail
// @route   GET /api/v1/auth/confirmemail/:confirmtoken
// @access  Public
exports.confirmEmail = asyncHandler(async (req, res, next) => {
  // Obter token
  const { confirmtoken } = req.params;
  const confirmEmailToken = crypto
    .createHash('sha256')
    .update(confirmtoken)
    .digest('hex');

  const user = await User.findOne({
    confirmEmailToken,
    isEmailConfirmed: false
  });

  if (!user) {
    return next(new ErrorResponse('Token inválido', 400));
  }

  // Atualizar usuário
  user.confirmEmailToken = undefined;
  user.isEmailConfirmed = true;
  await user.save({ validateBeforeSave: false });

  // Retornar token
  sendTokenResponse(user, 200, res);
});

// Obter token do modelo, criar cookie e enviar resposta
const sendTokenResponse = (user, statusCode, res) => {
  // Criar token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token
    });
};
