import axios from 'axios';

const testContact = async () => {
    try {
        const response = await axios.post('http://localhost:8000/api/v1/contact/send', {
            name: 'Test User',
            email: 'test@example.com',
            message: 'This is a test message'
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('Success:', response.data);
    } catch (error) {
        console.error('Error:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
    }
};

testContact(); 