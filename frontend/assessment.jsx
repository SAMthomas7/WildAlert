import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Assessment = () => {
    const [assessmentData, setAssessmentData] = useState(null);

    useEffect(() => {
        const fetchAssessmentData = async () => {
            try {
                const response = await axios.get('/api/assessment-data'); // Adjust the endpoint as needed
                setAssessmentData(response.data);
            } catch (error) {
                console.error('Error fetching assessment data:', error);
            }
        };

        fetchAssessmentData();
    }, []);

    if (!assessmentData) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <h1>Assessment Results</h1>
            <h2>Prediction</h2>
            <pre>{JSON.stringify(assessmentData.prediction, null, 2)}</pre>
            <h2>DeepSeek Result</h2>
            <pre>{assessmentData.deepseek_result}</pre>
        </div>
    );
};

export default Assessment;