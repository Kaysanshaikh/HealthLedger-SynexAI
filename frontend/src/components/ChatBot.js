import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Minus } from "lucide-react";

const ChatBot = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="mb-4 w-[90vw] md:w-[400px] h-[600px] bg-background border border-foreground/10 shadow-2xl rounded-2xl overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-4 bg-secondary flex items-center justify-between border-b border-foreground/5">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                                    <MessageSquare size={16} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold tracking-tight">HealthLedger SynexAI Assistant</h3>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Online</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 hover:bg-foreground/5 rounded-lg transition-colors text-muted-foreground"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Chat Content */}
                        <div className="flex-1 bg-white relative">
                            <iframe
                                src="https://udify.app/chatbot/XupO2rSI33Xj67ZP"
                                className="w-full h-full border-none"
                                allow="microphone"
                                title="HealthLedger SynexAI Assistant"
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="bg-foreground text-background p-4 rounded-full shadow-lg flex items-center justify-center border border-foreground/10 hover:bg-foreground/90 transition-colors"
            >
                {isOpen ? <Minus size={24} /> : <MessageSquare size={24} />}
            </motion.button>
        </div>
    );
};

export default ChatBot;
