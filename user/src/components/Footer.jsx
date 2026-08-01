import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="w-full bg-white border-t border-black/5 pt-20 pb-10 mt-32 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
                    {/* Brand Column */}
                    <div className="col-span-1 md:col-span-1 space-y-6">
                        <Link to="/" className="flex items-center gap-4 group">
                            <img src="/flashudlogo.png" alt="Flashud" className="w-8 h-8 object-contain brightness-0" />
                            <h2 className="text-2xl tracking-wide text-brand-dark font-kindred lowercase">
                                flashud
                            </h2>
                        </Link>
                        <p className="text-[10px] font-medium tracking-[0.2em] text-brand-dark/50 uppercase leading-relaxed">
                            Premium formal wear for the digital vanguard. Curated for those who demand excellence in every fiber.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div className="col-span-1">
                        <h3 className="text-xs font-bold text-brand-dark uppercase tracking-[0.2em] mb-6">Explore</h3>
                        <ul className="space-y-4">
                            <li><Link to="/shop" className="text-[10px] font-medium tracking-[0.2em] text-brand-dark/60 uppercase hover:text-brand-orange transition-colors">The Archive</Link></li>
                            <li><Link to="/shop" className="text-[10px] font-medium tracking-[0.2em] text-brand-dark/60 uppercase hover:text-brand-orange transition-colors">Collections</Link></li>
                            <li><Link to="/new-arrivals" className="text-[10px] font-medium tracking-[0.2em] text-brand-dark/60 uppercase hover:text-brand-orange transition-colors">New Arrivals</Link></li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div className="col-span-1">
                        <h3 className="text-xs font-bold text-brand-dark uppercase tracking-[0.2em] mb-6">Support</h3>
                        <ul className="space-y-4">
                            <li><Link to="/account" className="text-[10px] font-medium tracking-[0.2em] text-brand-dark/60 uppercase hover:text-brand-orange transition-colors">Client Portal</Link></li>
                            <li><Link to="/contact" className="text-[10px] font-medium tracking-[0.2em] text-brand-dark/60 uppercase hover:text-brand-orange transition-colors">Contact Concierge</Link></li>
                            <li><Link to="/returns" className="text-[10px] font-medium tracking-[0.2em] text-brand-dark/60 uppercase hover:text-brand-orange transition-colors">Returns & Exchanges</Link></li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div className="col-span-1">
                        <h3 className="text-xs font-bold text-brand-dark uppercase tracking-[0.2em] mb-6">Legal</h3>
                        <ul className="space-y-4">
                            <li><Link to="/privacy" className="text-[10px] font-medium tracking-[0.2em] text-brand-dark/60 uppercase hover:text-brand-orange transition-colors">Privacy Policy</Link></li>
                            <li><Link to="/terms" className="text-[10px] font-medium tracking-[0.2em] text-brand-dark/60 uppercase hover:text-brand-orange transition-colors">Terms of Service</Link></li>
                            <li><Link to="/shipping" className="text-[10px] font-medium tracking-[0.2em] text-brand-dark/60 uppercase hover:text-brand-orange transition-colors">Shipping Policy</Link></li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-black/5 pt-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.5em] text-brand-dark/40 text-center md:text-left">
                        © {new Date().getFullYear()} FLASHUD STOREFRONT // ALL RIGHTS RESERVED
                    </span>
                    <div className="flex gap-6">
                        <a href="#" className="text-brand-dark/30 hover:text-brand-orange transition-colors">
                            <span className="sr-only">Instagram</span>
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                            </svg>
                        </a>
                        <a href="#" className="text-brand-dark/30 hover:text-brand-orange transition-colors">
                            <span className="sr-only">Twitter</span>
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
