import { Button } from 'your-button-library';

const Founder = () => {
    return (
        <div>
            <h1>Meet Our Founder</h1>
            <Button asChild>
                <a href="https://linktr.ee/Rev24" target="_blank" rel="noopener noreferrer">Contact Founder</a>
            </Button>
        </div>
    );
};

export default Founder;