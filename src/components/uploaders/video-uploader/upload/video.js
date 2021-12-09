import { user } from 'dapp';


// 'contract' should be hard coded by application developer
let contract = '',
    definitions = {
        video: {
            additionalProperties: false,
            indices: [
                { properties: [{ $ownerId: 'asc' }], unique: false }
            ],
            properties: {
                description: {
                    type: 'string'
                },
                encrypted: {
                    type: 'boolean'
                },
                ipfs: {
                    additionalProperties: false,
                    properties: {
                        video: {
                            type: 'string'
                        },
                        banner: {
                            type: 'string'
                        },
                        thumbnail: {
                            type: 'string'
                        }
                    },
                    required: ['video'],
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
                transcoded: {
                    type: 'boolean'
                },
                unlisted: {
                    type: 'boolean'
                }
            },
            required: ['encrypted', 'name', 'transcoded', 'unlisted'],
            type: 'object'
        }
    },
    locators = {
        video: 'storage.video'
    };


const methods = {
    delete: async (documents) => {
        return await user.document.delete(documents);
    },
    read: async (query) => {
        return await user.document.read(locators.video, query || {});
    },
    register: async () => {
        await user.apps.get('storage', async () => {
            return contract || ( await user.contract.register(definitions) )['$id'];
        });

        return contract == true;
    },
    save: async (documents) => {
        return await user.document.save(documents, locators.video);
    },
};


export default methods;
