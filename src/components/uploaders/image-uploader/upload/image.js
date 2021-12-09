import { user } from 'dapp';


// 'contract' should be hard coded by application developer
let contract = '',
    definitions = {
        image: {
            additionalProperties: false,
            indices: [
                { properties: [{ $ownerId: 'asc' }], unique: false }
            ],
            properties: {
                compressed: {
                    type: 'boolean'
                },
                description: {
                    type: 'string'
                },
                encrypted: {
                    type: 'boolean'
                },
                ipfs: {
                    additionalProperties: false,
                    properties: {
                        gallery: {
                            items: {
                                type: 'string'
                            },
                            type: 'array'
                        },
                        image: {
                            type: 'string'
                        }
                    },
                    type: 'object'
                },
                keywords: {
                    items: {
                        type: 'string'
                    },
                    type: 'array'
                },
                name: {
                    type: 'string'
                },
                unlisted: {
                    type: 'boolean'
                }
            },
            required: ['compressed', 'unlisted'],
            type: 'object'
        }
    },
    locators = {
        image: 'storage.image'
    };


const methods = {
    delete: async (documents) => {
        return await user.document.delete(documents);
    },
    read: async (query) => {
        return await user.document.read(locators.image, query || {});
    },
    register: async () => {
        await user.apps.get('storage', async () => {
            return contract || ( await user.contract.register(definitions) )['$id'];
        });

        return contract == true;
    },
    save: async (documents) => {
        return await user.document.save(documents, locators.image);
    },
};


export default methods;
