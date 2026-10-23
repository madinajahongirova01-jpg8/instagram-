import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import nodemailer, { Transporter } from 'nodemailer';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly outboxDir: string;
  private readonly from: string;
  readonly webOrigin: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    this.from = config.getOrThrow<string>('MAIL_FROM');
    this.webOrigin = config.getOrThrow<string>('WEB_ORIGIN');
    this.outboxDir = resolve(config.getOrThrow<string>('MAIL_OUTBOX_DIR'));
    this.transporter = host
      ? nodemailer.createTransport({
          host,
          port: config.get<number>('SMTP_PORT') ?? 587,
          auth: config.get<string>('SMTP_USER')
            ? { user: config.get<string>('SMTP_USER'), pass: config.get<string>('SMTP_PASS') }
            : undefined,
        })
      : null;
  }

  async send(message: MailMessage): Promise<void> {
    try {
      if (this.transporter) {
        await this.transporter.sendMail({ from: this.from, ...message });
        this.logger.log({ subject: message.subject }, 'Email sent');
        return;
      }
      await mkdir(this.outboxDir, { recursive: true });
      const file = join(this.outboxDir, `${Date.now()}-${randomUUID()}.json`);
      await writeFile(file, JSON.stringify({ from: this.from, ...message }, null, 2), 'utf8');
      this.logger.log({ subject: message.subject, file }, 'Email written to dev outbox');
    } catch (error) {
      this.logger.error({ subject: message.subject, err: (error as Error).message }, 'Email delivery failed');
    }
  }

  async sendEmailVerification(to: string, token: string): Promise<void> {
    const link = `${this.webOrigin}/login?verifyToken=${encodeURIComponent(token)}`;
    await this.send({
      to,
      subject: 'Подтвердите email',
      text: `Чтобы подтвердить email, откройте ссылку (действует 24 часа):\n${link}`,
    });
  }

  async sendPasswordReset(to: string, token: string): Promise<void> {
    const link = `${this.webOrigin}/forgot-password?token=${encodeURIComponent(token)}`;
    await this.send({
      to,
      subject: 'Сброс пароля',
      text: `Чтобы задать новый пароль, откройте ссылку (действует 1 час):\n${link}\n\nЕсли вы не запрашивали сброс, просто проигнорируйте письмо.`,
    });
  }

  async sendSecurityNotice(to: string, text: string): Promise<void> {
    await this.send({ to, subject: 'Изменение в аккаунте', text });
  }
}
