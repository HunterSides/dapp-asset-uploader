import { config, user } from 'dapp';
import { alert, state } from 'ui/components';
import { dom, emitter } from 'ui/lib';
import image from './upload/image';


let initialized = false;


const init = async () => {
    if (initialized) {
        return;
    }

    // This step can be skipped in dapps once a metamask like
    // service is running for Dash.
    await user.init();

    let loading = dom.ref('anchor.loading'),
        wallet = await user.wallet.read();

    if (wallet.balance.confirmed > 0) {
        let reinit = false;

        reinit = await image.register();

        if (reinit) {
            await user.init(true);
        }

        alert.deactivate.error();
        alert.success('tDash found, all relevant contract information cached, welcome to the demo!', 8);

        if (loading) {
            state.deactivate(loading.element);
        }

        emitter.dispatch('user.init');
    }
    else {
        alert.error(`Deposit tDash in <b>${wallet.address}</b> to continue`);

        setTimeout(init, (1000 * 45));

        initialized = true;
    }
};


emitter.once('components.mounted', init);
