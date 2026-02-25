import React from 'react';
import { Button } from 'reactstrap';

const Founder = () => {
    const handleContactClick = () => {
        window.open('https://linktr.ee/Rev24', '_blank');
    };

    return (
        <div>
            <h1>Founder Component</h1>
            <Button color="primary" onClick={handleContactClick}>Contact Founder</Button>
        </div>
    );
};

export default Founder;