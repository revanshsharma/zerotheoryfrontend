import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import Badge from '@/components/ui/Badge';
import Section from '@/components/ui/Section';
import Quote from '@/components/ui/Quote';

const Founder = () => {
    return (
        <Section>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                <Badge>Founder</Badge>
                <h1>Welcome to our organization!</h1>
                <Quote text="Innovate. Inspire. Impact." />
                <Button onClick={() => window.location.href='https://linktr.ee/Rev24'}>
                    Contact Founder
                </Button>
            </motion.div>
        </Section>
    );
};

export default Founder;
