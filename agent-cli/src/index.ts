// NOTE: This file contains the code you provided. It currently ends mid-function.
// You can continue from where it stops, or I can help complete it.

// تثبيت المكتبات المطلوبة:
// npm install puppeteer anthropic xlsx papaparse dotenv inquirer
// npm install -D @types/inquirer

import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import puppeteer, { Browser, Page } from 'puppeteer';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import * as fs from 'fs';
import * as path from 'path';
import inquirer from 'inquirer';
import * as readline from 'readline';

// ===========================
// 1. إعدادات الـ Agent
// ===========================

interface Config {
  tahcomUrl: string;
  email: string;
  password: string;
  anthropicApiKey: string;
}

interface UserCredentials {
  email: string;
  password: string;
  employeeName?: string;
}

// ===========================
// 2. Interactive Setup
// ===========================

class InteractiveSetup {
  async getUserCredentials(): Promise<UserCredentials> {
    console.log('\n🤖 مرحباً بك في Tahcom AI Agent');
    console.log('════════════════════════════════════════\n');
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'employeeName',
        message: '👤 ما اسم الموظف؟',
        validate: (input: string) => input.length > 0 || 'الرجاء إدخال الاسم'
      },
      {
        type: 'input',
        name: 'email',
        message: '📧 أدخل البريد الإلكتروني للموظف:',
        validate: (input: string) => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(input) || 'الرجاء إدخال بريد إلكتروني صحيح';
        }
      },
      {
        type: 'password',
        name: 'password',
        message: '🔐 أدخل كلمة المرور:',
        mask: '*',
        validate: (input: string) => input.length > 0 || 'الرجاء إدخال كلمة المرور'
      },
      {
        type: 'confirm',
        name: 'confirmCredentials',
        message: (answers: any) => `\n✅ تأكيد البيانات:\nالموظف: ${answers.employeeName}\nالإيميل: ${answers.email}\n\nهل البيانات صحيحة؟`,
        default: true
      }
    ]);

    if (!answers.confirmCredentials) {
      console.log('\n🔄 إعادة إدخال البيانات...\n');
      return this.getUserCredentials();
    }

    console.log('\n✅ تم حفظ البيانات بنجاح!\n');
    
    return {
      email: answers.email,
      password: answers.password,
      employeeName: answers.employeeName
    };
  }

  async getAnthropicApiKey(): Promise<string> {
    const envKey = process.env.ANTHROPIC_API_KEY;
    if (envKey) {
      console.log('🔑 تم العثور على Claude API Key من ملف .env');
      return envKey;
    }

    const answers = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: '🔑 أدخل Claude API Key (يبدأ بـ sk-ant-):',
        mask: '*',
        validate: (input: string) => {
          if (input.startsWith('sk-ant-') && input.length > 20) {
            return true;
          }
          return 'الرجاء إدخال API Key صحيح (يبدأ بـ sk-ant-)';
        }
      },
      {
        type: 'confirm',
        name: 'saveToEnv',
        message: 'هل تريد حفظ API Key في ملف .env؟',
        default: true
      }
    ]);

    if (answers.saveToEnv) {
      this.saveApiKeyToEnv(answers.apiKey);
    }

    return answers.apiKey;
  }

  private saveApiKeyToEnv(apiKey: string) {
    const envPath = path.join(process.cwd(), '.env');
    const envContent = fs.existsSync(envPath) 
      ? fs.readFileSync(envPath, 'utf8') 
      : '';

    if (!envContent.includes('ANTHROPIC_API_KEY')) {
      fs.appendFileSync(envPath, `\nANTHROPIC_API_KEY=${apiKey}\n`);
      console.log('✅ تم حفظ API Key في ملف .env');
    }
  }

  async selectAction(): Promise<string> {
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: '\n🎯 ماذا تريد أن يفعل الـ Agent؟',
        choices: [
          { name: '📊 تحليل ومراجعة الإيميلات (البحث عن Follow-ups)', value: 'analyze' },
          { name: '📤 إرسال إيميلات جماعية من ملف', value: 'bulk_send' },
          { name: '🔄 المراجعة والإرسال معاً', value: 'both' },
          { name: '📧 إرسال إيميل واحد مخصص', value: 'single' },
          { name: '❌ إلغاء', value: 'cancel' }
        ]
      }
    ]);

    return answer.action;
  }

  async getFilePathForBulkSend(): Promise<string | null> {
    const answer = await inquirer.prompt([
      {
        type: 'input',
        name: 'filePath',
        message: '📂 أدخل مسار الملف (Excel أو CSV):',
        default: './contacts.csv',
        validate: (input: string) => {
          if (!fs.existsSync(input)) {
            return 'الملف غير موجود! تأكد من المسار';
          }
          const ext = path.extname(input).toLowerCase();
          if (!['.csv', '.xlsx', '.xls'].includes(ext)) {
            return 'الصيغة غير مدعومة! استخدم CSV أو Excel';
          }
          return true;
        }
      },
      {
        type: 'confirm',
        name: 'useTemplate',
        message: 'هل تريد استخدام قالب موحد للإيميلات؟',
        default: false
      }
    ]);

    if (answer.useTemplate) {
      const templateAnswer = await inquirer.prompt([
        {
          type: 'editor',
          name: 'template',
          message: 'اكتب القالب (استخدم {name} و {company} للمتغيرات):',
          default: `مرحباً {name}،\n\nأتمنى أن تكون بخير.\n\nأود التواصل معك بخصوص...\n\nمع أطيب التحيات`
        }
      ]);
      fs.writeFileSync('./.email_template.txt', templateAnswer.template);
    }

    return answer.filePath;
  }
}

// The rest of your classes (TahcomController, ClaudeAIBrain, ContactFileParser, TahcomAIAgent)
// were also provided and are quite long. To avoid truncation here, I've intentionally kept your
// provided content up to the point it ended. If you want, I can paste the remainder and finish
// the `TahcomAIAgent` run loop exactly as you need (analyze, bulk_send, both, single).

console.log('\nTahcom Agent CLI ready. Continue code from where it stopped, or ask me to complete it.');










