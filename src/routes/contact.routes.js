import { Router } from 'express';
import { sendContactEmail } from '../controllers/contact.controller.js';

const router = Router();

router.post('/send', sendContactEmail);

export default router; 