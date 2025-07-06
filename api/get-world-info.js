import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const worldBackgrounds = {
    'shopping-spree': 'https://cdn.prod.website-files.com/67e5317b686eccb10a95be01/67f506146fb421db045378af_cdcb9c23ac6f956cbb6f7f498c75cd11_worlds-Anxiety.avif',
    'waterpark': 'https://cdn.prod.website-files.com/67e5317b686eccb10a95be01/67f50606d058c933cd554be8_2938a42d480503a33daf8a8334f53f0a_worlds-Empathy.avif',
    'amusement-park': 'https://cdn.prod.website-files.com/67e5317b686eccb10a95be01/67f505fe412762bb8a01b03d_85fcbe125912ab0998bf679d2e8c6082_worlds-Love.avif',
    'big-city': 'https://cdn.prod.website-files.com/67e5317b686eccb10a95be01/67f505f572e936f2b665af1f_7b989a3fe827622216294c6539607059_worlds-Anger.avif',
    'spookyland': 'https://cdn.prod.website-files.com/67e5317b686eccb10a95be01/67f505ecd6f37624ef7affb8_587c997427b10cabcc31cc98d6e516f4_worlds-Fear.png',
    'neighborhood': 'https://cdn.prod.website-files.com/67e5317b686eccb10a95be01/67f505e36e849e0a811c0f1c_66d2f3d61b36a6427357732a392823c9_worlds-Boredom.avif'
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed. Use GET.' });
    }

    try {
        const { shareId } = req.query;
        if (!shareId) {
            return res.status(400).json({ success: false, error: 'Missing required parameter: shareId' });
        }

        const { data: lmidRecord, error } = await supabase
            .from('lmids')
            .select('world')
            .eq('share_id', shareId)
            .single();

        if (error || !lmidRecord || !lmidRecord.world) {
            console.error(`Fast lookup failed for shareId: ${shareId}`, error);
            return res.status(404).json({ success: false, error: 'ShareID not found or world not assigned' });
        }

        const world = lmidRecord.world;
        const backgroundUrl = worldBackgrounds[world] || null;

        return res.status(200).json({
            success: true,
            world: world,
            backgroundUrl: backgroundUrl
        });

    } catch (error) {
        console.error('Unexpected error in get-world-info:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
} 