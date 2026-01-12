import { useParams } from "react-router-dom";
import { DynamicDataExplorer } from "@/components/AdminGenericData/DynamicDataExplorer";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const PublicDataView = () => {
    const { id } = useParams();
    const [collection, setCollection] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCollection = async () => {
            if (!id) return;
            const { data } = await (supabase
                .from('data_collections' as any) as any)
                .select('name, description, is_published')
                .eq('id', id)
                .single();

            setCollection(data);
            setLoading(false);
        };

        fetchCollection();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!collection || !collection.is_published) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-2">Data Set Not Found</h1>
                    <p className="text-muted-foreground">This collection might be private or doesn't exist.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/30">
            <main className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">{collection.name}</h1>
                    <p className="text-muted-foreground text-lg">{collection.description}</p>
                </div>

                <DynamicDataExplorer collectionId={id!} />
            </main>
        </div>
    );
};

export default PublicDataView;
