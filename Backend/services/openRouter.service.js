import axios from 'axios';
import dotenv from 'dotenv'


export const askAI = async (messages) => {
    try {
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ message: "no message found" });
        }

        const response = await axios.post(process.env.OPEN_ROUTER_URL,
            {
                model: process.env.OPEN_ROUTER_MODEL,
                messages: messages
            }, {
            headers: {
                Authorization: `Bearer ${process.env.OPEN_ROUTER_APIKEY}`,
                'Content-Type': 'application/json',
            },
        }
        )

        const content = response?.data?.choices?.[0]?.message?.content;

        if (!content || !content.trim()) {
            return res.status(400).json({ message: "error in content in openRouter Api" })
        };

        return content;

    } catch (error) {
        return res.status(500).json({ message: "error in openRouter", error });
    }
}