import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

export function SmartJobSearch() {
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const { toast } = useToast();
    const navigate = useNavigate();

    const handleSearch = async () => {
        if (!query.trim()) return;
        // Fallback behavior: navigate to standard search results page with the query
        navigate(`/find-placements?keywords=${encodeURIComponent(query.trim())}`);
    };

    return (
        <div className="w-full">
            <div className="w-full bg-background/100 border border-border/70 rounded-2xl shadow-sm p-4 flex items-center gap-3 z-10">
                <div className="flex-1">
                    <Input
                        placeholder="E.g. 'Frontend React Developer with 3 years exp'"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="w-full bg-transparent h-12 text-lg"
                    />
                </div>
                <div>
                    <Button
                        onClick={handleSearch}
                        disabled={isSearching}
                        className="bg-primary hover:bg-primary-dark text-white h-12"
                    >
                        {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                        Search
                    </Button>
                </div>
            </div>

            {/* Results Dropdown/Area */}
            {results.length > 0 && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Top AI Matches</p>
                    {results.map((job) => (
                        <Card key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer" onClick={() => navigate(`/jobs/${job.id}`)}>
                            <CardContent className="p-3 flex items-start gap-3">
                                <Search className="w-4 h-4 text-purple-500 mt-1 shrink-0" />
                                <div>
                                    <h4 className="font-medium text-sm text-primary">{job.title}</h4>
                                    <p className="text-xs text-muted-foreground line-clamp-1">{job.description}</p>
                                    <span className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 px-1.5 py-0.5 rounded-full mt-1 inline-block">
                                        {(job.similarity * 100).toFixed(0)}% Match
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
