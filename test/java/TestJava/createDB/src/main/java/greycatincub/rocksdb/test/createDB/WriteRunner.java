package greycatincub.rocksdb.test.createDB;

import greycat.Graph;
import greycat.GraphBuilder;
import greycat.Node;
import greycat.NodeIndex;
import greycat.rocksdb.RocksDBStorage;

import java.util.Arrays;

public class WriteRunner {

    public static void main(String[] args) {
        if(args.length != 4) {
            System.err.println("Error in args. Usage: java <exec> <DB_PATH> <WORLD> <TIME> <INDEX_NAME>. Get: " + Arrays.toString(args));
            return;
        }

        final String dbPath = args[0];
        final long world = Long.parseLong(args[1]);
        final long time = Long.parseLong(args[2]);
        final String indexName = args[3];

        Graph graph = new GraphBuilder()
                .withStorage(new RocksDBStorage(dbPath))
                .build();

        graph.connect((Boolean coOK) -> {
            Node node = graph.newNode(world, time);

            graph.declareIndex(world, indexName, (NodeIndex idx) -> {
                idx.update(node);


                graph.save(null);

                graph.disconnect((Boolean discoOK) -> {

                });
            });
        });

    }
}
