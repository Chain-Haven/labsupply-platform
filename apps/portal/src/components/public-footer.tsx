import Link from 'next/link';
import { Package } from 'lucide-react';

export default function PublicFooter() {
    return (
        <footer className="border-t border-white/10">
            <div className="container mx-auto px-6 py-12">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                                <Package className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-white font-bold">WhiteLabel Peptides</span>
                        </div>
                        <p className="text-white/40 text-sm leading-relaxed">
                            White-label fulfillment for research-grade peptides and compounds.
                        </p>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold text-sm mb-3">Platform</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/learning-center" className="text-white/50 hover:text-white transition-colors">Learning Center</Link></li>
                            <li><Link href="/book-a-call" className="text-white/50 hover:text-white transition-colors">Book a Call</Link></li>
                            <li><Link href="/docs" className="text-white/50 hover:text-white transition-colors">Documentation</Link></li>
                            <li><Link href="/register" className="text-white/50 hover:text-white transition-colors">Get Started</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold text-sm mb-3">Legal</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/terms" className="text-white/50 hover:text-white transition-colors">Terms of Service</Link></li>
                            <li><Link href="/privacy" className="text-white/50 hover:text-white transition-colors">Privacy Policy</Link></li>
                            <li><Link href="/eula" className="text-white/50 hover:text-white transition-colors">EULA</Link></li>
                            <li><Link href="/disclaimer" className="text-white/50 hover:text-white transition-colors">Disclaimer</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold text-sm mb-3">Contact</h4>
                        <ul className="space-y-2 text-sm">
                            <li><a href="mailto:whitelabel@peptidetech.co" className="text-white/50 hover:text-white transition-colors">whitelabel@peptidetech.co</a></li>
                            <li><Link href="/book-a-call" className="text-white/50 hover:text-white transition-colors">Schedule a Call</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-6">
                    <p className="text-white/30 text-xs leading-relaxed mb-4">
                        Any mention of research chemicals or related compounds is for educational and informational
                        purposes only. These materials are not intended for human or veterinary use, and are not
                        classified as drugs, supplements, or food products under applicable law. By engaging with
                        this content, you acknowledge that it is your responsibility to understand and comply with
                        all relevant laws and regulations in your jurisdiction. Nothing on this site should be
                        interpreted as medical advice or a recommendation for use.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <span className="text-white/40 text-xs">&copy; {new Date().getFullYear()} Peptide Tech LLC. All rights reserved.</span>
                        <div className="flex items-center gap-4 text-white/40 text-xs">
                            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                            <Link href="/eula" className="hover:text-white transition-colors">EULA</Link>
                            <Link href="/disclaimer" className="hover:text-white transition-colors">Disclaimer</Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
