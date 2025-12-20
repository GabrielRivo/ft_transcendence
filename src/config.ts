import dotenv from 'dotenv';
dotenv.config();

// puis sera adapter avec le vault harchiCorp

const config = {
	sample: process.env.SAMPLE || 'default_sample_value',
};

export default config;
