'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Search,
    Shield,
    AlertTriangle,
    AlertCircle,
    Eye,
    EyeOff,
    Bell,
    Ban,
    RefreshCw,
    X,
    ExternalLink,
    Clock,
    CheckCircle,
    XCircle,
    Scan,
    Globe,
    FileWarning,
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

// Types
interface ComplianceViolation {
    id: string;
    scan_id: string;
    merchant_id: string;
    page_url: string;
    violation_type: string;
    severity: string;
    description: string;
    violating_text: string;
    suggested_fix?: string;
    admin_action: string;
    admin_action_at?: string;
    ignore_reason?: string;
    notified_at?: string;
    created_at: string;
    merchant_name: string;
    merchant_email: string;
    scan_url: string;
}

interface ComplianceScan {
    id: string;
    merchant_id: string;
    scan_url: string;
    pages_crawled: number;
    violations_found: number;
    status: string;
    error_message?: string;
    started_at?: string;
    completed_at?: string;
    created_at: string;
    merchant_name: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
}

interface Summary {
    pending: number;
    critical: number;
    high: number;
    scans_today: number;
}

// Filter constants
const violationTypeFilters = [
    { value: 'all', label: 'All Types' },
    { value: 'health_claim', label: 'Health Claims' },
    { value: 'dosage_advice', label: 'Dosage Advice' },
    { value: 'brand_name_usage', label: 'Brand Names' },
    { value: 'human_use_suggestion', label: 'Human Use' },
    { value: 'fda_violation', label: 'FDA Violation' },
    { value: 'other', label: 'Other' },
];

const severityFilters = [
    { value: 'all', label: 'All Severity' },
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
];

const actionFilters = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'ignored', label: 'Ignored' },
    { value: 'notified', label: 'Notified' },
    { value: 'blocked', label: 'Blocked' },
];

function getSeverityColor(severity: string) {
    switch (severity) {
        case 'critical': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
        case 'high': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
        case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
        case 'low': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        default: return 'bg-gray-100 text-gray-700';
    }
}

function getSeverityIcon(severity: string) {
    switch (severity) {
        case 'critical': return <XCircle className="w-3.5 h-3.5" />;
        case 'high': return <AlertTriangle className="w-3.5 h-3.5" />;
        case 'medium': return <AlertCircle className="w-3.5 h-3.5" />;
        case 'low': return <Clock className="w-3.5 h-3.5" />;
        default: return <Clock className="w-3.5 h-3.5" />;
    }
}

function getActionColor(action: string) {
    switch (action) {
        case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
        case 'ignored': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
        case 'notified': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        case 'blocked': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
        default: return 'bg-gray-100 text-gray-700';
    }
}

function getViolationTypeLabel(type: string) {
    const labels: Record<string, string> = {
        health_claim: 'Health Claim',
        dosage_advice: 'Dosage Advice',
        brand_name_usage: 'Brand Name',
        human_use_suggestion: 'Human Use',
        fda_violation: 'FDA Violation',
        other: 'Other',
    };
    return labels[type] || type;
}

function getScanStatusColor(status: string) {
    switch (status) {
        case 'completed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
        case 'running': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        case 'failed': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
        case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
        default: return 'bg-gray-100 text-gray-700';
    }
}

export default function CompliancePage() {
    const [activeTab, setActiveTab] = useState<'violations' | 'scans'>('violations');
    const [violations, setViolations] = useState<ComplianceViolation[]>([]);
    const [scans, setScans] = useState<ComplianceScan[]>([]);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, has_more: false });
    const [summary, setSummary] = useState<Summary>({ pending: 0, critical: 0, high: 0, scans_today: 0 });
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [severityFilter, setSeverityFilter] = useState('all');
    const [actionFilter, setActionFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal states
    const [ignoreModalOpen, setIgnoreModalOpen] = useState(false);
    const [notifyModalOpen, setNotifyModalOpen] = useState(false);
    const [blockModalOpen, setBlockModalOpen] = useState(false);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedViolation, setSelectedViolation] = useState<ComplianceViolation | null>(null);
    const [ignoreReason, setIgnoreReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            params.set('tab', activeTab);
            params.set('page', String(page));
            params.set('limit', '20');
            if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
            if (typeFilter !== 'all') params.set('violation_type', typeFilter);
            if (severityFilter !== 'all') params.set('severity', severityFilter);
            if (actionFilter !== 'all') params.set('admin_action', actionFilter);

            const res = await fetch(`/api/v1/admin/compliance?${params}`);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Failed to fetch: ${res.status}`);
            }
            const json = await res.json();

            if (activeTab === 'violations') {
                setViolations(json.data || []);
                setSummary(json.summary || { pending: 0, critical: 0, high: 0, scans_today: 0 });
            } else {
                setScans(json.data || []);
            }
            setPagination(json.pagination || { page: 1, limit: 20, total: 0, has_more: false });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    }, [page, activeTab, debouncedSearch, typeFilter, severityFilter, actionFilter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        setPage(1);
    }, [activeTab, debouncedSearch, typeFilter, severityFilter, actionFilter]);

    // Action handlers
    const handleIgnore = async () => {
        if (!selectedViolation || !ignoreReason.trim()) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/v1/admin/compliance/violations/${selectedViolation.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'ignored', ignore_reason: ignoreReason.trim() }),
            });
            if (!res.ok) throw new Error('Failed to ignore violation');

            toast({ title: 'Violation ignored', description: 'The ignore reason has been recorded for AI training.' });
            setIgnoreModalOpen(false);
            setIgnoreReason('');
            setSelectedViolation(null);
            fetchData();
        } catch (err) {
            toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNotify = async () => {
        if (!selectedViolation) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/v1/admin/compliance/violations/${selectedViolation.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'notified' }),
            });
            if (!res.ok) throw new Error('Failed to notify merchant');

            toast({ title: 'Merchant notified', description: `Email sent to ${selectedViolation.merchant_email}` });
            setNotifyModalOpen(false);
            setSelectedViolation(null);
            fetchData();
        } catch (err) {
            toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBlock = async () => {
        if (!selectedViolation) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/v1/admin/compliance/violations/${selectedViolation.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'blocked' }),
            });
            if (!res.ok) throw new Error('Failed to block merchant');

            toast({
                title: 'Merchant blocked',
                description: 'Shipping suspended, funds held, and orders placed on compliance hold.',
            });
            setBlockModalOpen(false);
            setSelectedViolation(null);
            fetchData();
        } catch (err) {
            toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const openIgnoreModal = (v: ComplianceViolation) => {
        setSelectedViolation(v);
        setIgnoreReason('');
        setIgnoreModalOpen(true);
    };

    const openNotifyModal = (v: ComplianceViolation) => {
        setSelectedViolation(v);
        setNotifyModalOpen(true);
    };

    const openBlockModal = (v: ComplianceViolation) => {
        setSelectedViolation(v);
        setBlockModalOpen(true);
    };

    const openDetailModal = (v: ComplianceViolation) => {
        setSelectedViolation(v);
        setDetailModalOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Shield className="w-7 h-7 text-orange-500" />
                        Compliance Scanner
                    </h1>
                    <p className="text-gray-500">AI-powered web scraping for RUO compliance violations</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className={cn('cursor-pointer transition-colors', actionFilter === 'pending' && 'ring-2 ring-yellow-500')} onClick={() => { setActionFilter('pending'); setActiveTab('violations'); }}>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? '—' : summary.pending}</p>
                            <p className="text-sm text-gray-500">Pending Review</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className={cn('cursor-pointer transition-colors', severityFilter === 'critical' && 'ring-2 ring-red-500')} onClick={() => { setSeverityFilter('critical'); setActiveTab('violations'); }}>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? '—' : summary.critical}</p>
                            <p className="text-sm text-gray-500">Critical</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className={cn('cursor-pointer transition-colors', severityFilter === 'high' && 'ring-2 ring-orange-500')} onClick={() => { setSeverityFilter('high'); setActiveTab('violations'); }}>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? '—' : summary.high}</p>
                            <p className="text-sm text-gray-500">High Severity</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer transition-colors" onClick={() => setActiveTab('scans')}>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                            <Scan className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? '—' : summary.scans_today}</p>
                            <p className="text-sm text-gray-500">Scans Today</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-2">
                <Button
                    variant={activeTab === 'violations' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('violations')}
                >
                    <FileWarning className="w-4 h-4 mr-1.5" />
                    Violations
                </Button>
                <Button
                    variant={activeTab === 'scans' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('scans')}
                >
                    <Globe className="w-4 h-4 mr-1.5" />
                    Scan History
                </Button>
            </div>

            {/* Filters */}
            {activeTab === 'violations' && (
                <Card>
                    <CardContent className="p-4">
                        <div className="flex flex-col gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Search violations..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    className="px-3 py-1.5 text-sm border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                >
                                    {violationTypeFilters.map((f) => (
                                        <option key={f.value} value={f.value}>{f.label}</option>
                                    ))}
                                </select>
                                <select
                                    value={severityFilter}
                                    onChange={(e) => setSeverityFilter(e.target.value)}
                                    className="px-3 py-1.5 text-sm border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                >
                                    {severityFilters.map((f) => (
                                        <option key={f.value} value={f.value}>{f.label}</option>
                                    ))}
                                </select>
                                <select
                                    value={actionFilter}
                                    onChange={(e) => setActionFilter(e.target.value)}
                                    className="px-3 py-1.5 text-sm border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                >
                                    {actionFilters.map((f) => (
                                        <option key={f.value} value={f.value}>{f.label}</option>
                                    ))}
                                </select>
                                {(typeFilter !== 'all' || severityFilter !== 'all' || actionFilter !== 'all' || searchQuery) && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setTypeFilter('all');
                                            setSeverityFilter('all');
                                            setActionFilter('all');
                                            setSearchQuery('');
                                        }}
                                    >
                                        <X className="w-3 h-3 mr-1" /> Clear Filters
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Error state */}
            {error && (
                <Card className="border-red-200 dark:border-red-800">
                    <CardContent className="p-4 flex items-center justify-between">
                        <p className="text-red-600 dark:text-red-400">{error}</p>
                        <Button variant="outline" size="sm" onClick={fetchData}>
                            <RefreshCw className="w-4 h-4 mr-2" /> Retry
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Violations Table */}
            {activeTab === 'violations' && (
                <Card>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-12 flex flex-col items-center justify-center gap-4">
                                <RefreshCw className="w-12 h-12 text-gray-400 animate-spin" />
                                <p className="text-gray-500">Loading violations...</p>
                            </div>
                        ) : violations.length === 0 ? (
                            <div className="p-12 text-center">
                                <Shield className="w-12 h-12 mx-auto text-green-400 mb-4" />
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">No violations found</h3>
                                <p className="text-gray-500">All merchant websites appear to be compliant</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-800/50 border-b">
                                        <tr>
                                            <th className="text-left p-4 text-sm font-medium text-gray-500">Merchant</th>
                                            <th className="text-left p-4 text-sm font-medium text-gray-500">Type</th>
                                            <th className="text-left p-4 text-sm font-medium text-gray-500">Severity</th>
                                            <th className="text-left p-4 text-sm font-medium text-gray-500 max-w-xs">Violation</th>
                                            <th className="text-left p-4 text-sm font-medium text-gray-500">Status</th>
                                            <th className="text-left p-4 text-sm font-medium text-gray-500">Found</th>
                                            <th className="text-right p-4 text-sm font-medium text-gray-500">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {violations.map((v) => (
                                            <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                <td className="p-4">
                                                    <p className="font-medium text-gray-900 dark:text-white text-sm">{v.merchant_name}</p>
                                                    <a
                                                        href={v.page_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5 max-w-[200px] truncate"
                                                    >
                                                        {new URL(v.page_url).pathname}
                                                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                                    </a>
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                        {getViolationTypeLabel(v.violation_type)}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', getSeverityColor(v.severity))}>
                                                        {getSeverityIcon(v.severity)}
                                                        {v.severity}
                                                    </span>
                                                </td>
                                                <td className="p-4 max-w-xs">
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 truncate" title={v.description}>
                                                        {v.description}
                                                    </p>
                                                    <p className="text-xs text-gray-400 truncate mt-0.5 italic" title={v.violating_text}>
                                                        &ldquo;{v.violating_text}&rdquo;
                                                    </p>
                                                </td>
                                                <td className="p-4">
                                                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', getActionColor(v.admin_action))}>
                                                        {v.admin_action}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-sm text-gray-500 whitespace-nowrap">
                                                    {formatRelativeTime(v.created_at)}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button size="sm" variant="ghost" onClick={() => openDetailModal(v)} title="View details">
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                        {v.admin_action === 'pending' && (
                                                            <>
                                                                <Button size="sm" variant="ghost" onClick={() => openIgnoreModal(v)} title="Ignore" className="text-gray-500 hover:text-gray-700">
                                                                    <EyeOff className="w-4 h-4" />
                                                                </Button>
                                                                <Button size="sm" variant="ghost" onClick={() => openNotifyModal(v)} title="Notify merchant" className="text-blue-500 hover:text-blue-700">
                                                                    <Bell className="w-4 h-4" />
                                                                </Button>
                                                                <Button size="sm" variant="ghost" onClick={() => openBlockModal(v)} title="Block services" className="text-red-500 hover:text-red-700">
                                                                    <Ban className="w-4 h-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Scans Table */}
            {activeTab === 'scans' && (
                <Card>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-12 flex flex-col items-center justify-center gap-4">
                                <RefreshCw className="w-12 h-12 text-gray-400 animate-spin" />
                                <p className="text-gray-500">Loading scans...</p>
                            </div>
                        ) : scans.length === 0 ? (
                            <div className="p-12 text-center">
                                <Scan className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">No scans yet</h3>
                                <p className="text-gray-500">Scans run automatically every day at 3 AM UTC</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-800/50 border-b">
                                        <tr>
                                            <th className="text-left p-4 text-sm font-medium text-gray-500">Merchant</th>
                                            <th className="text-left p-4 text-sm font-medium text-gray-500">URL</th>
                                            <th className="text-left p-4 text-sm font-medium text-gray-500">Status</th>
                                            <th className="text-center p-4 text-sm font-medium text-gray-500">Pages</th>
                                            <th className="text-center p-4 text-sm font-medium text-gray-500">Violations</th>
                                            <th className="text-left p-4 text-sm font-medium text-gray-500">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {scans.map((s) => (
                                            <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                <td className="p-4">
                                                    <p className="font-medium text-gray-900 dark:text-white text-sm">{s.merchant_name}</p>
                                                </td>
                                                <td className="p-4">
                                                    <a
                                                        href={s.scan_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm text-blue-600 hover:underline flex items-center gap-1 max-w-[250px] truncate"
                                                    >
                                                        {s.scan_url}
                                                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                                    </a>
                                                </td>
                                                <td className="p-4">
                                                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', getScanStatusColor(s.status))}>
                                                        {s.status}
                                                    </span>
                                                    {s.error_message && (
                                                        <p className="text-xs text-red-500 mt-1 max-w-[200px] truncate" title={s.error_message}>
                                                            {s.error_message}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="p-4 text-center text-sm text-gray-700 dark:text-gray-300">{s.pages_crawled}</td>
                                                <td className="p-4 text-center">
                                                    <span className={cn('text-sm font-medium', s.violations_found > 0 ? 'text-red-600' : 'text-green-600')}>
                                                        {s.violations_found}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-sm text-gray-500 whitespace-nowrap">
                                                    {formatRelativeTime(s.created_at)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Pagination */}
            {!loading && pagination.total > 0 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        Showing {activeTab === 'violations' ? violations.length : scans.length} of {pagination.total}
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                            Previous
                        </Button>
                        <Button variant="outline" size="sm" disabled={!pagination.has_more} onClick={() => setPage((p) => p + 1)}>
                            Next
                        </Button>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {detailModalOpen && selectedViolation && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileWarning className="w-5 h-5 text-orange-500" />
                                        Violation Details
                                    </CardTitle>
                                    <CardDescription>{selectedViolation.merchant_name}</CardDescription>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => { setDetailModalOpen(false); setSelectedViolation(null); }}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Type</p>
                                    <p className="text-sm font-medium">{getViolationTypeLabel(selectedViolation.violation_type)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Severity</p>
                                    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', getSeverityColor(selectedViolation.severity))}>
                                        {getSeverityIcon(selectedViolation.severity)}
                                        {selectedViolation.severity}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Status</p>
                                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', getActionColor(selectedViolation.admin_action))}>
                                        {selectedViolation.admin_action}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Found</p>
                                    <p className="text-sm">{formatRelativeTime(selectedViolation.created_at)}</p>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs text-gray-500 mb-1">Page URL</p>
                                <a href={selectedViolation.page_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                                    {selectedViolation.page_url}
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>

                            <div>
                                <p className="text-xs text-gray-500 mb-1">Description</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">{selectedViolation.description}</p>
                            </div>

                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">Violating Text</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300 italic">&ldquo;{selectedViolation.violating_text}&rdquo;</p>
                            </div>

                            {selectedViolation.suggested_fix && (
                                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                                    <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Suggested Compliant Alternative</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">&ldquo;{selectedViolation.suggested_fix}&rdquo;</p>
                                </div>
                            )}

                            {selectedViolation.ignore_reason && (
                                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                    <p className="text-xs text-gray-500 font-medium mb-1">Ignore Reason</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">{selectedViolation.ignore_reason}</p>
                                </div>
                            )}

                            {selectedViolation.admin_action === 'pending' && (
                                <div className="flex gap-2 pt-4 border-t">
                                    <Button variant="outline" className="flex-1" onClick={() => { setDetailModalOpen(false); openIgnoreModal(selectedViolation); }}>
                                        <EyeOff className="w-4 h-4 mr-2" /> Ignore
                                    </Button>
                                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={() => { setDetailModalOpen(false); openNotifyModal(selectedViolation); }}>
                                        <Bell className="w-4 h-4 mr-2" /> Notify Merchant
                                    </Button>
                                    <Button variant="destructive" className="flex-1" onClick={() => { setDetailModalOpen(false); openBlockModal(selectedViolation); }}>
                                        <Ban className="w-4 h-4 mr-2" /> Block Services
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Ignore Modal */}
            {ignoreModalOpen && selectedViolation && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-lg">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <EyeOff className="w-5 h-5" />
                                        Ignore Violation
                                    </CardTitle>
                                    <CardDescription>
                                        Please provide a reason why this finding should be ignored. This will be used to train the AI to avoid similar false positives.
                                    </CardDescription>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => { setIgnoreModalOpen(false); setSelectedViolation(null); }}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                                <p className="text-xs text-gray-500 mb-1">Flagged text</p>
                                <p className="text-sm italic text-gray-700 dark:text-gray-300">&ldquo;{selectedViolation.violating_text}&rdquo;</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Why should this be ignored? <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={ignoreReason}
                                    onChange={(e) => setIgnoreReason(e.target.value)}
                                    className="mt-1 w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-h-[100px]"
                                    placeholder="e.g., This is standard scientific terminology used in research context and does not imply human use..."
                                />
                            </div>
                            <div className="flex gap-3">
                                <Button variant="outline" className="flex-1" onClick={() => { setIgnoreModalOpen(false); setSelectedViolation(null); }}>
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={handleIgnore}
                                    disabled={isSubmitting || !ignoreReason.trim()}
                                >
                                    {isSubmitting ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Ignore & Train AI'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Notify Modal */}
            {notifyModalOpen && selectedViolation && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-lg">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Bell className="w-5 h-5 text-blue-500" />
                                        Notify Merchant
                                    </CardTitle>
                                    <CardDescription>
                                        Send a compliance notification email to the merchant.
                                    </CardDescription>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => { setNotifyModalOpen(false); setSelectedViolation(null); }}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 space-y-2">
                                <p className="text-sm"><span className="font-medium">To:</span> {selectedViolation.merchant_email}</p>
                                <p className="text-sm"><span className="font-medium">Merchant:</span> {selectedViolation.merchant_name}</p>
                                <p className="text-sm"><span className="font-medium">Violation:</span> {getViolationTypeLabel(selectedViolation.violation_type)}</p>
                                <p className="text-sm"><span className="font-medium">Page:</span> {selectedViolation.page_url}</p>
                            </div>
                            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                                <p className="text-xs text-red-600 font-medium mb-1">Flagged Content</p>
                                <p className="text-sm italic">&ldquo;{selectedViolation.violating_text}&rdquo;</p>
                            </div>
                            {selectedViolation.suggested_fix && (
                                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                                    <p className="text-xs text-green-600 font-medium mb-1">Suggested Fix (included in email)</p>
                                    <p className="text-sm">&ldquo;{selectedViolation.suggested_fix}&rdquo;</p>
                                </div>
                            )}
                            <div className="flex gap-3">
                                <Button variant="outline" className="flex-1" onClick={() => { setNotifyModalOpen(false); setSelectedViolation(null); }}>
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                                    onClick={handleNotify}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Sending...</> : <><Bell className="w-4 h-4 mr-2" /> Send Notification</>}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Block Modal */}
            {blockModalOpen && selectedViolation && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-lg border-red-200 dark:border-red-800">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-red-600">
                                        <Ban className="w-5 h-5" />
                                        Block Merchant Services
                                    </CardTitle>
                                    <CardDescription>
                                        This will immediately suspend the merchant and hold their funds.
                                    </CardDescription>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => { setBlockModalOpen(false); setSelectedViolation(null); }}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 space-y-2">
                                <p className="text-sm font-medium text-red-700 dark:text-red-400">The following actions will be taken immediately:</p>
                                <ul className="text-sm text-red-600 dark:text-red-400 space-y-1 list-disc pl-5">
                                    <li>Merchant status set to <strong>Suspended</strong></li>
                                    <li>All shipping <strong>blocked</strong></li>
                                    <li>Wallet funds <strong>held</strong></li>
                                    <li>All pending orders placed on <strong>Compliance Hold</strong></li>
                                    <li>Block notification email sent to merchant</li>
                                </ul>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                                <p className="text-sm"><span className="font-medium">Merchant:</span> {selectedViolation.merchant_name}</p>
                                <p className="text-sm"><span className="font-medium">Violation:</span> {selectedViolation.description}</p>
                            </div>
                            <div className="flex gap-3">
                                <Button variant="outline" className="flex-1" onClick={() => { setBlockModalOpen(false); setSelectedViolation(null); }}>
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="flex-1"
                                    onClick={handleBlock}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Blocking...</> : <><Ban className="w-4 h-4 mr-2" /> Block Services</>}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
