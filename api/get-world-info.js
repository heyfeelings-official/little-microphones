import { getSupabaseClient } from '../utils/lmid-utils.js';

const worldBackgrounds = {
    'shopping-spree': 'https://cdn.prod.website-files.com/67e5317b686eccb10a95be01/67f506146fb421db045378af_cdcb9c23ac6f956cbb6f7f498c75cd11_worlds-Anxiety.avif',
    'waterpark': 'https://cdn.prod.website-files.com/67e5317b686eccb10a95be01/67f50606d058c933cd554be8_2938a42d480503a33daf8a8334f53f0a_worlds-Empathy.avif',
    'amusement-park': 'https://cdn.prod.website-files.com/67e5317b686eccb10a95be01/67f505fe412762bb8a01b03d_85fcbe125912ab0998bf679d2e8c6082_worlds-Love.avif',
    'big-city': 'https://cdn.prod.website-files.com/67e5317b686eccb10a95be01/67f505f572e936f2b665af1f_7b989a3fe827622216294c6539607059_worlds-Anger.avif',
    'spookyland': 'https://cdn.prod.website-files.com/67e5317b686eccb10a95be01/67f505ecd6f37624ef7affb8_587c997427b10cabcc31cc98d6e516f4_worlds-Fear.png',
    'neighborhood': 'https://cdn.prod.website-files.com/67e5317b686eccb10a95be01/683859c64fa8c3f50ead799a_worlds-boredom.avif'
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

        const supabase = getSupabaseClient();

        // Search for the shareId in all world-specific columns
        const { data, error } = await supabase
            .from('lmids')
            .select('lmid, share_id_spookyland, share_id_waterpark, share_id_shopping_spree, share_id_amusement_park, share_id_big_city, share_id_neighborhood')
            .or(`share_id_spookyland.eq.${shareId},share_id_waterpark.eq.${shareId},share_id_shopping_spree.eq.${shareId},share_id_amusement_park.eq.${shareId},share_id_big_city.eq.${shareId},share_id_neighborhood.eq.${shareId}`)
            .single();

        if (error || !data) {
            console.error(`World lookup failed for shareId: ${shareId}`, error);
            return res.status(404).json({ success: false, error: 'ShareID not found' });
        }

        // Determine which world this shareId belongs to
        let world = null;
        if (data.share_id_spookyland === shareId) world = 'spookyland';
        else if (data.share_id_waterpark === shareId) world = 'waterpark';
        else if (data.share_id_shopping_spree === shareId) world = 'shopping-spree';
        else if (data.share_id_amusement_park === shareId) world = 'amusement-park';
        else if (data.share_id_big_city === shareId) world = 'big-city';
        else if (data.share_id_neighborhood === shareId) world = 'neighborhood';

        if (!world) {
            return res.status(404).json({ success: false, error: 'World not found for shareId' });
        }

        const backgroundUrl = worldBackgrounds[world];

        return res.status(200).json({
            success: true,
            world: world,
            backgroundUrl: backgroundUrl,
            lmid: data.lmid
        });

    } catch (error) {
        console.error('Unexpected error in get-world-info:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
} 