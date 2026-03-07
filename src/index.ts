import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import {connectDB} from './mongodb/ConnectDB';
dotenv.config();
import authRoutes from './routes/auth.route';
import kycRoutes from './routes/kyc.route';
import walletRoutes from './routes/wallet.route';
import paymentRoutes from './routes/payment.route';


const app = express();
app.use(express.json());
app.use(express.urlencoded({ limit: '10mb'}))
app.use(express.json({ limit: '10mb'}))
app.use('/api', authRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/payments', paymentRoutes);

const PORT = process.env.PORT || 3000;

app.get('/', (req: Request, res: Response ) => {
    res.send('API is running....');
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})

connectDB();