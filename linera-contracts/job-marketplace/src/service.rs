/*!
Job Marketplace Service - Minimal GraphQL Interface
*/

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use async_graphql::{EmptySubscription, Object, Request, Response, Schema};
use linera_sdk::{
    linera_base_types::WithServiceAbi,
    Service, ServiceRuntime,
};

pub struct JobMarketplaceService {
    _runtime: ServiceRuntime<Self>,
}

linera_sdk::service!(JobMarketplaceService);

impl WithServiceAbi for JobMarketplaceService {
    type Abi = job_marketplace::JobMarketplaceAbi;
}

impl Service for JobMarketplaceService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        JobMarketplaceService { _runtime: runtime }
    }

    async fn handle_query(&self, request: Request) -> Response {
        let schema = Schema::build(QueryRoot, MutationRoot, EmptySubscription).finish();
        schema.execute(request).await
    }
}

struct QueryRoot;

#[Object]
impl QueryRoot {
    async fn hello(&self) -> String {
        "Job Marketplace Service".to_string()
    }
}

struct MutationRoot;

#[Object]
impl MutationRoot {
    async fn _placeholder(&self) -> bool {
        true
    }
}
