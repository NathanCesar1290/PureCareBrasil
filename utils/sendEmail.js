const nodemailer = require('nodemailer');
const pug = require('pug');
const { htmlToText } = require('html-to-text');
const logger = require('./logger');

// Classe para envio de e-mails
module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`;
  }

  // Criar transporte
  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      // SendGrid
      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD
        }
      });
    }

    // Mailtrap para desenvolvimento
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }


  // Enviar o e-mail
  async send(template, subject) {
    try {
      // 1) Renderizar o template Pug
      const html = pug.renderFile(
        `${__dirname}/../views/email/${template}.pug`,
        {
          firstName: this.firstName,
          url: this.url,
          subject
        }
      );

      // 2) Definir opções do e-mail
      const mailOptions = {
        from: this.from,
        to: this.to,
        subject,
        html,
        text: htmlToText(html, {
          wordwrap: 130
        })
      };

      // 3) Criar transporte e enviar e-mail
      await this.newTransport().sendMail(mailOptions);
      logger.info(`E-mail enviado para: ${this.to}`);
    } catch (error) {
      logger.error(`Erro ao enviar e-mail para ${this.to}: ${error.message}`);
      throw new Error('Houve um erro ao enviar o e-mail. Tente novamente mais tarde!');
    }
  }

  // Métodos para diferentes tipos de e-mail
  async sendWelcome() {
    await this.send('welcome', 'Bem-vindo ao E-commerce!');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Seu token de redefinição de senha (válido por 10 minutos)'
    );
  }

  async sendEmailConfirmation() {
    await this.send(
      'emailConfirmation',
      'Confirmação de e-mail (válido por 24h)'
    );
  }

  async sendOrderConfirmation() {
    await this.send(
      'orderConfirmation',
      'Confirmação de Pedido - Obrigado por comprar conosco!'
    );
  }

  async sendOrderShipped() {
    await this.send(
      'orderShipped',
      'Seu pedido foi enviado!'
    );
  }

  async sendOrderDelivered() {
    await this.send(
      'orderDelivered',
      'Seu pedido foi entregue!'
    );
  }

  async sendCustomEmail(subject, message) {
    try {
      const mailOptions = {
        from: this.from,
        to: this.to,
        subject,
        text: message,
        html: `<p>${message.replace(/\n/g, '<br>')}</p>`
      };

      await this.newTransport().sendMail(mailOptions);
      logger.info(`E-mail personalizado enviado para: ${this.to}`);
    } catch (error) {
      logger.error(`Erro ao enviar e-mail personalizado para ${this.to}: ${error.message}`);
      throw new Error('Houve um erro ao enviar o e-mail. Tente novamente mais tarde!');
    }
  }
};

// Função auxiliar para enviar e-mail simples
exports.sendEmail = async (options) => {
  try {
    // 1) Criar um transportador
    let transporter;
    
    if (process.env.NODE_ENV === 'production') {
      // Usar SendGrid em produção
      transporter = nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD
        }
      });
    } else {
      // Usar Mailtrap em desenvolvimento
      transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD
        }
      });
    }


    // 2) Definir as opções do e-mail
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: options.email,
      subject: options.subject,
      text: options.message
    };

    // 3) Enviar o e-mail
    await transporter.sendMail(mailOptions);
    logger.info(`E-mail enviado para: ${options.email}`);
  } catch (error) {
    logger.error(`Erro ao enviar e-mail para ${options.email}: ${error.message}`);
    throw new Error('Houve um erro ao enviar o e-mail. Tente novamente mais tarde!');
  }
};
