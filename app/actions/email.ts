'use server'

import { Resend } from 'resend'
import { withAuth } from './auth'

const resend = new Resend(process.env.RESEND_API_KEY)

async function sendDemoEmailInternal(
  firstName: string,
  lastName: string,
  email: string,
  organization: string,
  role: string,
  interests: string
) {
  try {
    const alertEmails = process.env.APP_EMAIL_ALERTS?.split(',').map(e => e.trim()) || ['jlindqui@gmail.com'];
    const data = await resend.emails.send({
      from: 'B&B AI <demorequests@transactional.brownandbeatty.com>',
      to: alertEmails,
      subject: 'New Demo Request',
      html: `



        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #1a365d;">New Demo Request</h1>
          <p><strong>Name:</strong> ${firstName} ${lastName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Organization:</strong> ${organization}</p>
          <p><strong>Role:</strong> ${role}</p>
          <hr style="border: 1px solid #e2e8f0; margin: 20px 0;"/>
          <p><strong>Interests:</strong></p>
          <p style="white-space: pre-wrap;">${interests}</p>
        </div>
      `,
    });

    if (data.error) {
      throw new Error(data.error.message);
    }
    
    return { success: true }
  } catch (error) {
    console.error('Failed to send email:', error)
    return { success: false, error: 'Failed to send email' }
  }
}

async function sendContactEmailInternal(
  category: string,
  email: string,
  message: string
) {
  try {
    const alertEmails = process.env.APP_EMAIL_ALERTS?.split(',').map(e => e.trim()) || ['jlindqui@gmail.com'];
    const data = await resend.emails.send({
      from: 'B&B AI <contact@transactional.brownandbeatty.com>', // Use this until domain is verified
      to: alertEmails,
      subject: `New Contact Form Submission: ${category}`,
      html: `


        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #1a365d;">New Contact Form Submission</h1>
          <p><strong>From:</strong> ${email}</p>
          <p><strong>Category:</strong> ${category}</p>
          <hr style="border: 1px solid #e2e8f0; margin: 20px 0;"/>
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap;">${message}</p>
        </div>
      `,
    });

    if (data.error) {
      throw new Error(data.error.message);
    }
    
    return { success: true }
  } catch (error) {
    console.error('Failed to send email:', error)
    return { success: false, error: 'Failed to send email' }
  }
}

async function sendSurveyEmailInternal(formData: FormData, surveyId: string) {
  try {
    // Get tool limitations as array
    const toolLimitations = formData.getAll('tool_limitations');
    const alertEmails = process.env.APP_EMAIL_ALERTS?.split(',').map(e => e.trim()) || ['jlindqui@gmail.com'];

    const data = await resend.emails.send({
      from: 'B&B AI <contact@transactional.brownandbeatty.com>',
      to: alertEmails,
      subject: 'New Survey Response',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #1a365d;">Survey Response</h1>
          <hr style="border: 1px solid #e2e8f0; margin: 20px 0;"/>
          
          <p><strong>Survey ID:</strong> ${surveyId}</p>
          
          <h2>Organization Details</h2>
          <p><strong>Role:</strong> ${formData.get('role')}</p>
          <p><strong>Company Size:</strong> ${formData.get('company_size')}</p>
          
          <h2>Dispute Statistics</h2>
          <p><strong>Number of Disputes (Last 12 Months):</strong> ${formData.get('disputes')}</p>
          <p><strong>Percentage Going to Arbitration:</strong> ${formData.get('arbitrations')}</p>
          <p><strong>Employees Handling Disputes:</strong> ${formData.get('employees')}</p>
          <p><strong>Employee Time on Disputes:</strong> ${formData.get('employees_time')}%</p>
          
          <h2>Time Allocation</h2>
          <p><strong>Evidence Collection Time:</strong> ${formData.get('evidence_time')}</p>
          <p><strong>Historical Case Search Time:</strong> ${formData.get('historical_time')}</p>
          <p><strong>Agreement Analysis Time:</strong> ${formData.get('agreement_time')}</p>
          
          <h2>Financial</h2>
          <p><strong>Annual Legal Fees:</strong> ${formData.get('legal_fees')}</p>
          
          <h2>Tool Limitations</h2>
          <p><strong>Current Limitations:</strong></p>
          <ul>
            ${toolLimitations.map(limitation => `<li>${limitation}</li>`).join('')}
          </ul>
          
          <h2>AI Adoption</h2>
          <p><strong>AI Openness:</strong> ${formData.get('ai_openness')}</p>
          
          <h2>Pain Points</h2>
          <p style="white-space: pre-wrap;">${formData.get('pain_point')}</p>
        </div>
      `,
    });

    if (data.error) {
      throw new Error(data.error.message);
    }
    
    return { success: true }
  } catch (error) {
    console.error('Failed to send survey results:', error)
    return { success: false, error: 'Failed to send survey results' }
  }
}

async function sendSurveyContactEmailInternal(
  email: string,
  company: string,
  surveyId: string
) {
  try {
    const alertEmails = process.env.APP_EMAIL_ALERTS?.split(',').map(e => e.trim()) || ['jlindqui@gmail.com'];
    const data = await resend.emails.send({

      from: 'B&B AI <contact@transactional.brownandbeatty.com>',
      to: alertEmails,
      subject: 'Survey Contact Info Submission',
      html: `

        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #1a365d;">Survey Contact Info</h1>
          <hr style="border: 1px solid #e2e8f0; margin: 20px 0;"/>
          
          <h2>Contact Details</h2>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Company:</strong> ${company}</p>
          <p><strong>Survey ID:</strong> ${surveyId}</p>

          <p style="margin-top: 20px;">This person completed the survey and is interested in implementing Brown and Beatty Solutions.</p>
        </div>
      `,
    });

    if (data.error) {
      throw new Error(data.error.message);
    }
    
    return { success: true }
  } catch (error) {
    console.error('Failed to send contact info:', error)
    return { success: false, error: 'Failed to send contact info' }
  }
}

async function sendWaitlistEmailInternal(
  firstName: string,
  lastName: string,
  email: string,
  organization: string,
  role: string,
  interests: string
) {
  try {
    const alertEmails = process.env.APP_EMAIL_ALERTS?.split(',').map(e => e.trim()) || ['jlindqui@gmail.com'];
    const data = await resend.emails.send({
      from: 'B&B AI <waitlist@transactional.brownandbeatty.com>',
      to: alertEmails,
      subject: 'New Waitlist Signup',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #1a365d;">New Waitlist Signup</h1>
          <p><strong>Name:</strong> ${firstName} ${lastName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Organization:</strong> ${organization}</p>
          <p><strong>Role:</strong> ${role}</p>
          <hr style="border: 1px solid #e2e8f0; margin: 20px 0;"/>
          ${interests ? `
            <p><strong>Interests:</strong></p>
            <p style="white-space: pre-wrap;">${interests}</p>
          ` : ''}
        </div>
      `,
    });

    if (data.error) {
      throw new Error(data.error.message);
    }
    
    return { success: true }
  } catch (error) {
    console.error('Failed to send waitlist notification:', error)
    return { success: false, error: 'Failed to send waitlist notification' }
  }
} 



export const sendDemoEmail = withAuth(sendDemoEmailInternal)
export const sendContactEmail = sendContactEmailInternal
export const sendSurveyEmail = sendSurveyEmailInternal
export const sendSurveyContactEmail = sendSurveyContactEmailInternal
export const sendWaitlistEmail = sendWaitlistEmailInternal
